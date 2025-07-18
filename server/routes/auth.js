const { Router } = require("express");
const router = Router();

const authController = require("../controllers/authController");
const {
  registerValidation,
  loginValidation
} = require("../middleware/validator/authValidator");

router.get("/", (req, res) =>
  res.json({ success: 1, message: "Welcome to Live Chatting Platform!" })
);

// User 
router.post("/register", registerValidation, authController.register);
router.post("/login", loginValidation, authController.login);

// Admin login
router.post("/admin/login", loginValidation, authController.adminLogin);
router.post("/logout", authController.logout);

module.exports = router;
