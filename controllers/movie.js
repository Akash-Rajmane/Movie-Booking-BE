const Movie = require("../models/movie");

const getMoviesList = async (req, res, next) => {
  try {
    const movies = await Movie.find().select("_id title poster");
    res.status(200).json({ movies });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Get details of a specific movie
const getMovieDetails = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.status(200).json({ movie });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Add a new movie with showtimes and seat availability
const addMovie = async (req, res, next) => {
  try {
    const { title, imageUrl, description, poster, duration, showtimes } =
      req.body;
    // Check for required fields
    if (!title || !imageUrl || !poster || !duration || !showtimes) {
      return res.status(400).json({ message: "All fields are required." });
    }
    // Create a new movie document
    const movie = new Movie({
      title,
      imageUrl,
      poster,
      description,
      duration,
      showtimes,
    });

    // Save the movie to the database
    await movie.save();
    res.status(201).json({ message: "Movie added successfully!", movie });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMoviesList,
  getMovieDetails,
  addMovie,
};
