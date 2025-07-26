const mongoose = require("mongoose");
const crypto = require("crypto");
const moment = require("moment-timezone");

const merchantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    app_name_id: {
      type: Number,
      unique: true,
      required: true,
    },
    app_secret_key: {
      type: String,
      unique: true,
      required: true,
      default: () => crypto.randomBytes(16).toString("hex"),
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

merchantSchema.pre("save", function (next) {
  const now = moment().tz("Asia/Yangon").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  this.createdAt = now;
  this.updatedAt = now;

  if (!this.app_name_id) {
    this.app_name_id = Math.floor(100000 + Math.random() * 900000);
  }

  next();
});

merchantSchema.pre("update", function (next) {
  const now = moment().tz("Asia/Yangon").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  this.updatedAt = now;
  next();
});

module.exports = mongoose.model("Merchant", merchantSchema);
