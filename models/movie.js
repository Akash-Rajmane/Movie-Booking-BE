const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    poster: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true },
    showtimes: [
      {
        time: { type: Date, required: true, index: true },
        seats: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seat",
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
