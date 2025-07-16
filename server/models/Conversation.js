const mongoose = require('mongoose');

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
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);