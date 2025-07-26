const User = require("../models/User");

const isAdmin = async (req, res, next) => {
  if (req.user?.role === "admin") {
    next();
  } else {
    res.status(401).json({
      isSuccess: false,
      message: "Access denied: you don't have necessary permissions.",
    });
  }
};

module.exports = { isAdmin };
