const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ isSuccess: false, message: errors.array()[0].msg });
  }

  const { name, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ name }, { phone }] });

    if (existingUser) {
      let msg = existingUser.name === name ? "Username already exists! " : "";
      msg += existingUser.phone === phone ? "Phone number already exists!" : "";
      return res.status(400).json({ isSuccess: false, message: msg.trim() });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, phone, password: hashedPassword });

    return res.status(201).json({
      isSuccess: true,
      message: "User created!",
      data: { name, phone }
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ isSuccess: false, message: errors.array()[0].msg });
  }

  const { name, password } = req.body;

  try {
    const user = await User.findOne({ name });
    if (!user || user.role !== "user") {
      throw new Error("Invalid credentials or unauthorized access!");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid password.");

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_KEY, { expiresIn: "7d" });

    return res.status(200).json({
      isSuccess: true,
      message: "Login successful.",
      token,
      data: {
        name: user.name,
        phone: user.phone,
        user_role: user.role,
        id: user._id
      }
    });
  } catch (error) {
    return res.status(401).json({ isSuccess: false, message: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ isSuccess: false, message: errors.array()[0].msg });
  }

  const { name, password } = req.body;

  try {
    const admin = await User.findOne({ name });
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: admin access only.");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new Error("Invalid password.");

    const token = jwt.sign({ userId: admin._id, role: admin.role }, process.env.JWT_KEY, { expiresIn: "1d" });

    return res.status(200).json({
      isSuccess: true,
      message: "Login successful.",
      token,
      data: {
        name: admin.name,
        phone: admin.phone,
        user_role: admin.role,
        id: admin._id
      }
    });
  } catch (error) {
    return res.status(401).json({ isSuccess: false, message: error.message });
  }
};

exports.logout = (req, res) => {
  req.session?.destroy?.((err) => {
    if (err) return res.status(500).send("fail");
    res.status(200).send("logout success.");
  });
};
