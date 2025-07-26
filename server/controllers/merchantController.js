const Merchant = require("../models/Merchant");
const crypto = require("crypto");

exports.createMerchant = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Merchant Name Is Required!" });
    }

    const app_name_id = Math.floor(100000 + Math.random() * 900000);
    const app_secret_key = crypto.randomBytes(16).toString("hex");

    const existingMerchant = await Merchant.findOne({ name });
    if (existingMerchant) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Merchant Is Already Exists!" });
    }

    const merchant = await Merchant.create({
      name,
      app_name_id,
      app_secret_key,
    });

    return res.status(201).json({
      isSuccess: true,
      message: "Merchant Created Successfully!",
      merchant,
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.getAllMerchants = async (req, res) => {
  try {
    const merchants = await Merchant.find().sort({ createdAt: -1 });
    return res.status(200).json({
      isSuccess: true,
      message: "Merchant Lists Reterived Successfully!",
      merchants,
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.getMerchantById = async (req, res) => {
  try {
    const { id } = req.params;
    const merchant = await Merchant.findById(id);

    if (!merchant) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Merchant Not Found!" });
    }

    return res.status(200).json({ isSuccess: true, merchant });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, message: err.message });
  }
};

exports.updateMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const merchant = await Merchant.findById(id);
    if (!merchant) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Merchant not found." });
    }

    if (name) merchant.name = name;
    if (status) merchant.status = status;

    await merchant.save();

    return res.status(200).json({
      isSuccess: true,
      message: "Merchant updated successfully.",
      merchant,
    });
  } catch (err) {
    return res.status(500).json({ isSuccess: false, message: err.message });
  }
};

exports.deleteMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const merchant = await Merchant.findByIdAndDelete(id);

    if (!merchant) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "Merchant not found." });
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Merchant deleted successfully.",
    });
  } catch (err) {
    return res.status(500).json({ isSuccess: false, message: err.message });
  }
};
