const User = require("../models/user");
const Seat = require("../models/seat");
const Movie = require("../models/movie");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Error registering user", error: err.message });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Credentials!" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
};

const checkAuth = async (req, res, next) => {
  res.status(200).json({ message: "Authenticated" });
};

const logout = (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};

const addSeats = async (req, res, next) => {
  try {
    const { seatCount, movieId, showtime } = req.body;

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const seats = [];
    for (let i = 0; i < seatCount; i++) {
      const seat = new Seat({ number: `S${i + 1}`, movie: movieId });
      seats.push(seat);
    }

    // Save seats to the database
    const savedSeats = await Seat.insertMany(seats);

    // Associate seats with the showtime in the movie
    const showtimeIndex = movie.showtimes.findIndex(
      (s) => s.time.toISOString() === new Date(showtime).toISOString()
    );
    if (showtimeIndex === -1) {
      movie.showtimes.push({ time: showtime, seats: savedSeats });
    } else {
      movie.showtimes[showtimeIndex].seats.push(...savedSeats);
    }

    await movie.save();

    res.status(201).json({
      message: `${seatCount} seats added successfully!`,
      seats: savedSeats,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error adding seats", error: err.message });
  }
};

module.exports = {
  register,
  login,
  checkAuth,
  addSeats,
  logout,
};
