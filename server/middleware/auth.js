const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = async (req, res, next) => {
  try {
    const token = req?.headers?.authorization?.split(" ")?.[1];

    if (!token) {
      throw new Error("Unauthorized");
    }

    const decryptedTokenDetails = jwt.verify(token, process.env.JWT_KEY);

    // ✅ Fix here
    req.user = {
      _id: decryptedTokenDetails.userId,
      role: decryptedTokenDetails.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      isSuccess: false,
      message: error.message,
    });
  }
};
