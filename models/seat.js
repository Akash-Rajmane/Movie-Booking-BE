const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  number: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  timeoutId: {
    type: String,
    default: null,
  },
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Movie",
    required: true,
  },
});

module.exports = mongoose.model("Seat", seatSchema);
