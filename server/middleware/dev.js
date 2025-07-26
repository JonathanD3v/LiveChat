const User = require("../models/User");

const isDev = async (req, res, next) => {
  if (req.user?.role === "developer") {
    next();
  } else {
    res.status(401).json({
      isSuccess: false,
      message: "Access denied: you don't have necessary permissions.",
    });
  }
};

module.exports = { isDev };
