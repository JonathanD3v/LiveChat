const { default: mongoose, mongo } = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const getOrCreateConversation = async (userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let conversation = await Conversation.findOne({ user: userId })
      .populate('user', 'name role')
      .populate('admin', 'name role')
      .session(session);

    if (conversation) {
      await session.endSession();
      return conversation;
    }

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) throw new Error('No admin available');

    conversation = new Conversation({ user: userId, admin: admin._id });
    await conversation.save({ session });
    await session.commitTransaction();
    session.endSession();
    return conversation.populate('user admin');
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const sendMessage = async (conversationId, senderId, content, type = 'text') => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (type === 'text' && (!content || content.length > 500)) {
      throw new Error('Text message must be between 1 and 500 characters.');
    }

    if (
      type === 'image' &&
      (!content ||
        typeof content !== 'string' ||
        !content.match(/\.(jpeg|jpg|png|gif|webp)$/i))
    ) {
      throw new Error('Invalid image format.');
    }

    const conversation = await Conversation.findById(conversationId).session(session);
    if (!conversation) throw new Error('Conversation not found');

    const allowedIds = [conversation.user.toString(), conversation.admin?.toString()];
    if (!allowedIds.includes(senderId.toString())) throw new Error('Unauthorized sender');

    const message = await Message.create(
      [
        {
          conversation: conversationId,
          sender: senderId,
          content,
          type,
        },
      ],
      { session }
    );

    const msg = message[0];

    // Count unread
    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      sender: { $ne: senderId },
      read: false,
    }).session(session);

    // Update conversation's unread count
    const recipientField = senderId.toString() === conversation.user.toString() ? 'admin' : 'user';

    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: msg._id,
        [`unreadCount.${recipientField}`]: unreadCount,
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populatedMessage = await Message.populate(msg, {
      path: 'sender',
      select: 'name role',
    });

    return populatedMessage;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getConversationMessages = async (conversationId, userId, page = 1, limit = 20) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [{ user: userId }, { admin: userId }],
  });

  if (!conversation) throw new Error('Conversation not found or unauthorized');

  const senderToMark = userId.toString() === conversation.admin?.toString() ? conversation.user : conversation.admin;
  const recipient = userId.toString() === conversation.admin?.toString() ? 'admin' : 'user';

  await Message.updateMany(
    { conversation: conversationId, sender: senderToMark, read: false },
    { $set: { read: true } }
  );

  await Conversation.findByIdAndUpdate(conversationId, { $set: { [`unreadCount.${recipient}`]: 0 } });

  const options = {
    page,
    limit,
    sort: { createdAt: 1 }, 
    populate: { path: 'sender', select: 'name role' },
  };

  const paginatedResult = await Message.paginate({ conversation: conversationId }, options);

  return paginatedResult;
};



const getAdminConversations = async (adminId) => {
  return await Conversation.find({
    $or: [{ admin: adminId }, { admin: null }],
  })
    .populate('user', 'name online')
    .populate('lastMessage')
    .sort('-updatedAt');
};


const getOrCreateConversationHandler = async (req, res) => {
  try {
    const conversation = await getOrCreateConversation(req.user._id);
    return res.status(200).json({
      isSuccess: true,
      message: 'User conversation retrieved successfully',
      data: conversation,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};

const getUserConversationMessagesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const conversation = await getOrCreateConversation(req.user._id);

    const paginatedResult = await getConversationMessages(
      conversation._id,
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      isSuccess: true,
      message: 'Messages retrieved successfully.',
      data: paginatedResult,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};



const sendUserMessageHandler = async (req, res) => {
  try {
    const conversation = await getOrCreateConversation(req.user._id);
    let { type = 'text', content } = req.body;
    if (req.file) {
      type = 'image';
      content = `/uploads/${req.file.filename}`;
    }

    const message = await sendMessage(conversation._id, req.user._id, content, type);
    return res.status(201).json({
      isSuccess: true,
      message: 'Message sent successfully.',
      data: message,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};

const getAdminConversationsHandler = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const options = {
      page: pageNum,
      limit: limitNum,
      sort: { updatedAt: -1 },
      populate: [
        { path: 'user', select: 'name online' },
        { path: 'lastMessage' }
      ]
    };
    const conversations = await Conversation.paginate({
      $or: [{ admin: req.user._id }, { admin: null }]
    }, options);
    return res.status(200).json({
      isSuccess: true,
      message: 'Admin conversations retrieved successfully.',
      data: conversations,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};

const getAdminMessagesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const conversationId = req.params.conversationId;

    const paginatedResult = await getConversationMessages(
      conversationId,
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      isSuccess: true,
      message: 'Messages retrieved successfully.',
      data: paginatedResult,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};

const sendAdminMessageHandler = async (req, res) => {
  try {
    let { content, type = 'text' } = req.body;
    if (req.file) {
      content = `/uploads/${req.file.filename}`;
      type = 'image';
    }

    const message = await sendMessage(req.params.conversationId, req.user._id, content, type);
    return res.status(201).json({
      isSuccess: true,
      message: 'Admin message sent successfully.',
      data: message,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};

const deleteMessage = async (messageId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const message = await Message.findById(messageId).session(session);
    if (!message) {
      throw new Error('Message not found!');
    }

    const conversation = await Conversation.findById(message.conversation).session(session);
    if (!conversation) throw new Error('Conversation not found');
    if (message.sender.toString() !== userId.toString()) {
      throw new Error('Unauthorized to delete this message');
    }
    await message.deleteOne({ session });

    // If it was the last message, update it
    if (conversation.lastMessage?.toString() === messageId) {
      const previous = await Message.findOne({
        conversation: message.conversation,
      })
        .sort({ createdAt: -1 })
        .session(session);

      conversation.lastMessage = previous ? previous._id : null;
      await conversation.save({ session });
    }

    await session.commitTransaction();
    session.endSession();
    return { isSuccess: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const deleteMessageHandler = async (req, res) => {
  try {
    const result = await deleteMessage(req.params.messageId, req.user._id);
    return res.status(200).json({
      isSuccess: true,
      message: 'Message deleted successfully.',
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};

const broadcastMessageFromAdmin = async (adminId, content) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const conversations = await Conversation.find({
      $or: [{ admin: adminId }, { admin: null }],
    }).session(session);

    const messages = [];
    for (const convo of conversations) {
      const message = new Message({
        conversation: convo._id,
        sender: adminId,
        content,
        type: 'text',
      });

      await message.save({ session });
      convo.lastMessage = message._id;
      convo.unreadCount.user += 1;
      await convo.save({ session });

      messages.push(message);
    }
    await session.commitTransaction();
    session.endSession();

    return messages;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const broadcastMessageHandler = async (req, res) => {
  try {
    const { content } = req.body;
    const messages = await broadcastMessageFromAdmin(req.user._id, content);
    return res.status(201).json({
      isSuccess: true,
      message: 'Broadcast message sent to all conversations.',
      data: messages,
    });
  } catch (err) {
    return res.status(400).json({
      isSuccess: false,
      message: err.message,
    });
  }
};

module.exports = {
  getOrCreateConversationHandler,
  getUserConversationMessagesHandler,
  sendUserMessageHandler,
  getAdminConversationsHandler,
  getAdminMessagesHandler,
  sendAdminMessageHandler,
  deleteMessageHandler,
  broadcastMessageHandler,
};
