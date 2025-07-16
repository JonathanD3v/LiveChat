const mongoose = require('mongoose');

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
    enum: ['text', 'image', 'file'], 
    default: 'text' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);