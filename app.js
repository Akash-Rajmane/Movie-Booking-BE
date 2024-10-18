const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const xss = require("xss-clean");

//Routes
const userRoutes = require("./routes/user");
const seatRoutes = require("./routes/seat");
const movieRoutes = require("./routes/movie");

dotenv.config();

const app = express();

const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(xss());

//sanitize request data
app.use(mongoSanitize());

//enable cookie parser
app.use(cookieParser());

app.use(compression());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

app.use("/api/users", userRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/movies", movieRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is running on ${PORT}`);
    });
  })
  .catch((err) => console.log(err));

// error handling
app.use(async (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});
