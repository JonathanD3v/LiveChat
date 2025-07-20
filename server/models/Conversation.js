const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");


const conversationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'pending'], 
    default: 'active' 
  },
  unreadCount: { 
    user: { type: Number, default: 0 },
    admin: { type: Number, default: 0 }
  },
  lastMessage: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  app_name_id: {
    type: Number,
    default: null,
  },
}, { timestamps: true });

const moment = require("moment-timezone");
conversationSchema.pre("save", function (next) {
  const now = moment().tz("Asia/Yangon").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  this.createdAt = now;
  this.updatedAt = now;
  next();
});

conversationSchema.pre("update", function (next) {
  const now = moment().tz("Asia/Yangon").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  this.updatedAt = now;
  next();
});

conversationSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Conversation', conversationSchema);