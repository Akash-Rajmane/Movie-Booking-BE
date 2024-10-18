const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Access denied" });
  }

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById({ _id: id }).select("-password");
    if (user) {
      req.user = user;
      next();
    } else {
      throw new Error("User not found!");
    }
  } catch (err) {
    console.log(err);
    return res
      .status(401)
      .json({ message: "Invalid or expired token!", error: err.message });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You are not authorized!" });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
