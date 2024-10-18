const express = require("express");
const seatController = require("../controllers/seat");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/get-seats/:movieId/:showtime",
  authenticateToken,
  seatController.getSeats
);

router.post("/lock-seat", authenticateToken, seatController.lockSeat);

router.post("/unlock-seat", authenticateToken, seatController.unlockSeat);

router.post(
  "/confirm-booking",
  authenticateToken,
  seatController.confirmBooking
);

module.exports = router;
