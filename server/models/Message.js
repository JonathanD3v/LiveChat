const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");

const messageSchema = new mongoose.Schema({
  conversation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { 
    type: String, 
    enum: ['text', 'image'], 
    default: 'text' 
  }
}, { timestamps: true });

messageSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Message', messageSchema);