const { body } = require("express-validator");
const { Router } = require("express");
const { PhoneNumberUtil } = require("google-libphonenumber");

const router = Router();

const authController = require("../controllers/authController");

const checkMyanmarPhoneNumber = (phone) => {
  const phoneUtil = PhoneNumberUtil.getInstance();
  try {
    const number = phoneUtil.parse(phone, "MM");
    return phoneUtil.isValidNumber(number);
  } catch (error) {
    return false;
  }
};

router.get("/", (req, res) => {
  return res.json({ success: 1, message: "Welcome to Live Chatting Platform!" });
});

router.post(
  "/register",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Please enter your name!")
      .isLength({ min: 3 })
      .withMessage("Name must have at least three characters!"),
      body("phone")
      .trim()
      .custom((value) => {
        if (!checkMyanmarPhoneNumber(value)) {
          throw new Error("Phone number is not valid!");
        }
        return true;
      }),
    body("password").trim().notEmpty().withMessage("Please enter your password!"),
    body("confirm_password")
      .trim()
      .notEmpty()
      .withMessage("Password must be the same")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match!");
        }
        return true;
      }),
    
  ],
  authController.register
);

router.post(
  "/login",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name must have!")
      .isLength({ min: 3 })
      .withMessage("Name must have at least three characters!"),
    body("password").trim().notEmpty().withMessage("Password must have!"),
  ],
  authController.login
);
// for admin 
router.post(
  "/admin/login",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name must have!")
      .isLength({ min: 3 })
      .withMessage("Name must have at least three characters!"),
    body("password").trim().notEmpty().withMessage("Password must have!"),
  ],
  authController.adminLogin
);

router.post("/logout", authController.logout);

module.exports = router;