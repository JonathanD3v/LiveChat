const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Start or get conversation between user and admin
const getOrCreateConversation = async (userId) => {
  // Find existing conversation
  let conversation = await Conversation.findOne({ user: userId })
    .populate('user', 'name role')
    .populate('admin', 'name role');

  if (conversation) {
    return conversation;
  }

  // Find an available admin
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('No admin available');
  }

  // Create new conversation
  conversation = new Conversation({
    user: userId,
    admin: admin ? admin._id : null
  });

  await conversation.save();
  return conversation.populate('user admin');
};

// Send message from user to admin or admin to user
const sendMessage = async (conversationId, senderId, content, type = 'text') => {
  if (type === 'text') {
    if (!content || content.length > 500) {
      throw new Error('Text message must be between 1 and 500 characters.');
    }
  } else if (type === 'image') {
    if (!content || typeof content !== 'string' || !content.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
      throw new Error('Image content must be a valid image URL ending in .jpg, .png, etc.');
    }
  } else {
    throw new Error('Invalid message type.');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const allowedIds = [conversation.user.toString()];
  if (conversation.admin) allowedIds.push(conversation.admin.toString());
  if (!allowedIds.includes(senderId.toString())) {
    throw new Error("Unauthorized to send message in this conversation");
  }

  const message = new Message({
    conversation: conversationId,
    sender: senderId,
    content,
    type
  });

  await message.save();

  let recipientField = '';
  if(senderId.toString() === conversation.user.toString()){
    recipientField = 'admin'
  }else{
    recipientField = 'user'
  }

  const unreadCount = await Message.countDocuments({
    conversation:conversationId,
    sender:{$ne:senderId},
    read:false
  })

  // Update conversation last message and unread counts
  const updateData = { lastMessage: message._id, [`unreadCount.${recipientField}`]:unreadCount };
  

  await Conversation.findByIdAndUpdate(conversationId, updateData);

  // Populate sender info before returning
  const populatedMessage = await Message.populate(message, {
    path: 'sender',
    select: 'name role'
  });

  return populatedMessage;
};

// Get all conversations for admin
const getAdminConversations = async (adminId) => {
  return Conversation.find({
    $or: [
      { admin: adminId },
      { admin: null }
    ]
  })
  .populate('user', 'name online')
  .populate('lastMessage')
  .sort('-updatedAt');
};
  

// Get messages in a conversation
const getConversationMessages = async (conversationId, userId) => {
  // Verify user has access to this conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [{ user: userId }, { admin: userId }]
  });

  if (!conversation) {
    throw new Error('Conversation not found or unauthorized');
  }

  // Mark messages as read
  if (userId.toString() === conversation.admin?.toString()) {
    // Admin is viewing - mark user's messages as read
    await Message.updateMany(
      { 
        conversation: conversationId,
        sender: conversation.user,
        read: false
      },
      { $set: { read: true } }
    );
    
    // Reset admin unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { 'unreadCount.admin': 0 }
    });
  } else {
    // User is viewing - mark admin's messages as read
    await Message.updateMany(
      { 
        conversation: conversationId,
        sender: conversation.admin,
        read: false
      },
      { $set: { read: true } }
    );
    
    // Reset user unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { 'unreadCount.user': 0 }
    });
  }

  // Get messages
  return await Message.find({ conversation: conversationId })
    .populate('sender', 'name role')
    .sort('createdAt');
};

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getAdminConversations,
  getConversationMessages
};