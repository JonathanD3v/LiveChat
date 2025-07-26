const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "bot", "developer"],
      default: "user",
    },
    online: { type: Boolean, default: false },
    socketId: { type: String },
    lastSeen: { type: Date },
    resetToken: String,
    tokenExpiration: Date,
    app_name_id: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const moment = require("moment-timezone");
userSchema.pre("save", function (next) {
  const now = moment().tz("Asia/Yangon").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  this.createdAt = now;
  this.updatedAt = now;
  next();
});

userSchema.pre("update", function (next) {
  const now = moment().tz("Asia/Yangon").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  this.updatedAt = now;
  next();
});

// userSchema.plugin(mongoosePaginate);
const userModel = model("User", userSchema);

module.exports = userModel;
