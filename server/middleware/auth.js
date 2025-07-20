const jwt = require("jsonwebtoken");
const Token = require("../models/UserToken")
require("dotenv").config();

module.exports = async (req, res, next) => {
  try {
    const token = req?.headers?.authorization?.split(" ")?.[1];

    if (!token) {
      throw new Error("Unauthorized. Please Log In.");
    }

    const decryptedTokenDetails = jwt.verify(token, process.env.JWT_KEY);

    const tokenInDB = await Token.findOne({token})
    if (!tokenInDB) {
      throw new Error("Token invalid or expired. Please log in again.");
    }

    req.user = {
      _id: decryptedTokenDetails.userId,
      role: decryptedTokenDetails.role,
      app_name_id: decryptedTokenDetails.app_name_id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      isSuccess: false,
      message: error.message,
    });
  }
};
