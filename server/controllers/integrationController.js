const Merchant = require("../models/Merchant");
const User = require("../models/User");
const Token = require("../models/UserToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      app_name_id: user.app_name_id,
    },
    process.env.JWT_KEY,
    { expiresIn: "7d" }
  );
};

exports.authFromMerchant = async (req, res) => {
  const { app_name_id, app_secret_key, user } = req.body;
  console.log("Incoming request from Adonis site", req.body);

  try {
    const merchant = await Merchant.findOne({ app_name_id, app_secret_key });

    if (!merchant || merchant.status !== "active") {
      return res
        .status(401)
        .json({ isSuccess: false, message: "Unauthorized" });
    }

    let existingUser = await User.findOne({ name: user.name });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash("merchant_pass", 10);
      existingUser = await User.create({
        name: user.name,
        phone: user.phone,
        app_name_id,
        password: hashedPassword,
        role: user.role || "user",
      });
    }

    const token = createToken(existingUser);
    await Token.create({ userId: existingUser._id, token });

    return res.status(200).json({
      isSuccess: true,
      token,
      user: {
        id: existingUser._id,
        name: existingUser.name,
        phone: existingUser.phone,
        role: existingUser.role,
        app_name_id,
        merchant_name: merchant.name,
      },
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, message: error.message });
  }
};
