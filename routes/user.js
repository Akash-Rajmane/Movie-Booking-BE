const express = require("express");
const userController = require("../controllers/user");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");

const router = express.Router();

router.get("/check-auth", authenticateToken, userController.checkAuth);

router.post("/register", userController.register);

router.post("/login", userController.login);

router.post("/logout", userController.logout);

router.post(
  "/admin/add-seats",
  //authenticateToken,
  //authorizeRoles("admin"),
  userController.addSeats
);

module.exports = router;
