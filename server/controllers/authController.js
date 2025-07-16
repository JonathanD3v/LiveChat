const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

exports.register = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      isSuccess: false,
      message: errors.array()[0].msg,
    });
  }

  const { name, phone, password } = req.body;

  try {
    const userDoc = await User.findOne({ $or: [{ name }, { phone }] });

    if (userDoc) {
      let errorMessage = "";

      if (userDoc.name === name) {
        errorMessage += "Username is already exists!";
      }

      if (userDoc.phone === phone) {
        errorMessage += "Phone number is already exists!";
      }

      return res
        .status(400)
        .json({ isSuccess: false, message: errorMessage.trim() });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      name,
      phone,
      password: hashedPassword,
    });

    return res.status(201).json({
      isSuccess: true,
      message: "User created!",
      data: {
        name,
        phone,
      },
    });
  } catch (error) {
    return res.status(500).json({
      isSuccess: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      isSuccess: false,
      message: errors.array()[0].msg,
    });
  }

  const { name, password } = req.body;

  try {
    //check name
    const userDoc = await User.findOne({ name });

    if (!userDoc) {
      throw new Error("This username doesn't exists.");
    }

    if (userDoc.is_banned) {
      throw new Error("You don't have right from accessing this platform!");
    }

    if (userDoc.role !== "user") {
      throw new Error("You don't have right from accessing this platform!");
    }

    //check pwd
    const isMatch = await bcrypt.compare(password, userDoc.password);

    if (!isMatch) {
      throw new Error("Invalid password.");
    }

    //create jwt token
    const token = jwt.sign(
      { userId: userDoc._id, role: userDoc.role },
      process.env.JWT_KEY,
      {
        expiresIn: "7d",
      }
    );

    const data = {
      name: userDoc?.name,
      phone: userDoc?.phone,
      user_role: userDoc?.role,
      id: userDoc?._id,
    };

    return res.status(200).json({
      isSuccess: true,
      message: "Login successful.",
      token,
      data,
    });
  } catch (error) {
    return res.status(401).json({
      isSuccess: false,
      message: error.message,
    });
  }
};

exports.adminLogin = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      isSuccess: false,
      message: errors.array()[0].msg,
    });
  }

  const { name, password } = req.body;

  try {
    //check name
    const userDoc = await User.findOne({ name });

    if (!userDoc) {
      throw new Error("This username doesn't exists.");
    }

    if (userDoc.role !== "admin") {
      throw new Error(
        "Unauthorized: you are not allowed to access this route."
      );
    }

    //check pwd
    const isMatch = await bcrypt.compare(password, userDoc.password);

    if (!isMatch) {
      throw new Error("Invalid password.");
    }

    //create jwt token
    const token = jwt.sign(
      { userId: userDoc._id, role: userDoc.role },
      process.env.JWT_KEY,
      {
        expiresIn: "1d",
      }
    );

    const data = {
      name: userDoc?.name,
      phone: userDoc?.phone,
      user_role: userDoc?.role,
      id: userDoc?._id,
    };

    return res.status(200).json({
      isSuccess: true,
      message: "Login successful.",
      token,
      data,
    });
  } catch (error) {
    return res.status(401).json({
      isSuccess: false,
      message: error.message,
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((_) => {
    if (err) {
      return res.status(500).send("fail");
    }
    res.status(200).send("logout success.");
  });
};

exports.checkCurrentUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const userDoc = await User.findById(userId).select("name phone");

    if (!userDoc) {
      throw new Error("Unauthorized user.");
    }

    return res.status(200).json({
      isSuccess: true,
      message: "User is authorized.",
      userDoc,
    });
  } catch (error) {
    return res.status(401).json({
      isSuccess: false,
      message: error.message,
    });
  }
};

// exports.generateBot = async () => {
//   try {
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash("password is bot", salt);
//     const names = [""];

//     await User.create({
//       name,
//       phone,
//       password: hashedPassword,
//     });
//   } catch (error) {
//     console.log("Error generating bot : ", error.message);
//   }
// };

// exports.changePassword = async (req, res) => {
//   const { userId, old_password, new_password } = req.body;

//   try {
//     const user = await User.findById(userId);

//     if (!old_password) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "old_passwrod is required." });
//     }

//     if (!new_password) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "new_password is required." });
//     }

//     if (!user) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "No user is found." });
//     }

//     const isMatch = await bcrypt.compare(old_password, user.password);

//     if (!isMatch) {
//       return res
//         .status(400)
//         .json({ isSuccess: false, message: "Old password is incorrect" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(new_password, salt);
//     await user.save();

//     res
//       .status(200)
//       .json({ isSuccess: true, message: "Password changed successfully." });
//   } catch (error) {
//     res.status(500).json({ isSuccess: false, message: error.message });
//   }
// };