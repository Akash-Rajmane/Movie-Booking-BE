const Seat = require("../models/seat");
const Movie = require("../models/movie");
const Bull = require("bull");
const redisClient = require("../redisClient");

const bookingQueue = new Bull("booking-queue", {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PW,
  },
});

const getSeats = async (req, res, next) => {
  try {
    const { movieId, showtime } = req.params;

    // Find the movie by ID
    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    // Find the showtime in the movie's showtimes array
    const selectedShowtime = movie.showtimes.find(
      (st) => new Date(st.time).getTime() === new Date(showtime).getTime()
    );

    if (!selectedShowtime) {
      return res
        .status(404)
        .json({ message: "Showtime not found for this movie" });
    }

    // Get the seats associated with the selected showtime
    const seats = await Seat.find({ _id: { $in: selectedShowtime.seats } });

    res.status(200).json({ seats, userId: req.user._id });
  } catch (err) {
    console.error(err); // Changed to console.error for better logging
    res
      .status(500)
      .json({ message: "Error in getting seats data", error: err.message });
  }
};

const lockSeat = async (req, res, next) => {
  try {
    const { seatId } = req.body;
    // console.log(seatId, "seatId in lock seat");
    const seat = await Seat.findById(seatId);

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    // Check if the seat is already locked in Redis
    const seatLock = await redisClient.get(`seatLock:${seatId}`);
    // console.log(seatLock, "seatLock");
    if (seatLock) {
      return res.status(400).json({ message: "Seat is already locked." });
    }

    if (seat.isBooked) {
      return res.status(400).json({ message: "Seat is already booked" });
    }

    // Lock the seat in Redis with an expiration (e.g., 1 minute)
    await redisClient.set(`seatLock:${seatId}`, req.user.id);

    // Set timeout to unlock the seat after 1 minute
    const timeoutId = setTimeout(async () => {
      await redisClient.del(`seatLock:${seatId}`);
      seat.lockedBy = null;
      seat.lockedUntil = null;
      seat.timeoutId = null;
      await seat.save();
      console.log(`Unlocked the seat: ${seatId}`);
    }, 60000);

    seat.lockedBy = req.user.id;
    seat.lockedUntil = new Date(Date.now() + 1 * 60 * 1000);
    seat.timeoutId = timeoutId.toString();
    await seat.save();

    res.status(200).json({ message: "Seat locked successfully!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error locking seat", error: err.message });
  }
};

const unlockSeat = async (req, res, next) => {
  try {
    const { seatId } = req.body;

    const userId = req.user.id;

    const seat = await Seat.findById(seatId);

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    const seatLock = await redisClient.get(`seatLock:${seatId}`);

    if (seatLock && seatLock !== userId) {
      //console.log(seatLock, userId);
      return res.status(403).json({ message: "You cannot unlock this seat" });
    }

    // Unlock the seat by removing the lock from Redis
    await redisClient.del(`seatLock:${seatId}`);

    // Clear the timeout if it exists
    if (seat.timeoutId) {
      clearTimeout(parseInt(seat.timeoutId, 10));
    }

    seat.lockedBy = null;
    seat.lockedUntil = null;
    seat.timeoutId = null;
    await seat.save();

    res.status(200).json({ message: "Seat unlocked successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error unlocking seat", error: err.message });
  }
};

const confirmBooking = async (req, res, next) => {
  try {
    const { seatIds, movieId } = req.body;

    // Validate movie existence
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    // Ensure all seats belong to the specified movie
    for (const seatId of seatIds) {
      const seat = await Seat.findById(seatId);
      if (!seat || seat.movie.toString() !== movieId) {
        return res.status(400).json({
          message: `Seat ${seatId} does not belong to the selected movie`,
        });
      }

      const seatLock = await redisClient.get(`seatLock:${seatId}`);
      if (!seatLock || seatLock !== req.user.id) {
        return res
          .status(400)
          .json({ message: `Seat ${seatId} is no longer available` });
      }
    }

    // Add the booking job to the queue
    bookingQueue.add(
      { userId: req.user.id, seatIds, movieId },
      {
        attempts: 3,
        backoff: {
          type: "fixed",
          delay: 5000,
        },
      }
    );
    res.status(200).json({ message: "Booking request received and queued" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Error in booking seat", error: err.message });
  }
};

bookingQueue.process(async (job) => {
  const { userId, seatIds, movieId } = job.data;

  const session = await Seat.startSession();
  session.startTransaction();
  try {
    const seats = await Seat.find({ _id: { $in: seatIds }, movie: movieId });

    if (seats.length !== seatIds.length) {
      throw new Error(
        "One or more seats are already booked or invalid for this movie"
      );
    }

    // Clear timeouts for booked seats
    for (const seat of seats) {
      if (seat.timeoutId) {
        clearTimeout(parseInt(seat.timeoutId, 10));
      }
    }

    // Update the seat status to booked
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      {
        isBooked: true,
        bookedBy: userId,
        lockedBy: null,
        lockedUntil: null,
        timeoutId: null,
      }
    ).session(session);

    await session.commitTransaction();
    console.log(
      `Seats successfully booked for user ${userId} for movie ${movieId}`
    );
  } catch (err) {
    console.log(err);
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
});

// Handling Failed Jobs
bookingQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed after ${job.attemptsMade} attempts`);
  console.error("Error:", err);
});

// Handling Job Completion
bookingQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

module.exports = {
  getSeats,
  lockSeat,
  unlockSeat,
  confirmBooking,
};
