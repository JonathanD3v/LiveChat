const { body } = require("express-validator");
const checkMyanmarPhoneNumber = require("../../utils/phoneValidator");

exports.registerValidation = [
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
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Please enter your password!"),
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
];

exports.loginValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name must have!")
    .isLength({ min: 3 })
    .withMessage("Name must have at least three characters!"),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password must have!"),
];
