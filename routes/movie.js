const express = require("express");
const movieController = require("../controllers/movie");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

router.get("/get-movies", authenticateToken, movieController.getMoviesList);
router.get(
  "/get-movie/:movieId",
  authenticateToken,
  movieController.getMovieDetails
);

router.post(
  "/add-movie", //authenticateToken,
  movieController.addMovie
);

module.exports = router;
