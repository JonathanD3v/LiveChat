const { default: mongoose } = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { normalizeMyanmarText } = require("../utils/myanmarText");


const getOrCreateConversation = async (userId) => {
  const session = await mongoose.startSession();
  let committed = false;

  try {
    session.startTransaction();

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    let conversation = await Conversation.findOne({ user: userId })
      .populate("user", "name role")
      .populate("admin", "name role")
      .session(session);

    if (conversation) {
      const adminStillExists = await User.findOne({
        _id: conversation.admin,
        role: "admin",
      });
      if (!adminStillExists)
        throw new Error("Admin is no longer available for this conversation.");

      await session.commitTransaction();
      committed = true;
      session.endSession();
      return conversation;
    }

    const admin = await User.findOne({
      role: "admin",
      app_name_id: user.app_name_id,
    });
    if (!admin)
      throw new Error("No admin is available for this merchant at the moment.");

    conversation = new Conversation({
      user: userId,
      admin: admin._id,
      app_name_id: user.app_name_id,
    });

    await conversation.save({ session });

    await session.commitTransaction();
    committed = true;
    session.endSession();

    return conversation.populate("user admin");
  } catch (error) {
    if (!committed) await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const sendMessage = async (
  conversationId,
  senderId,
  content,
  type = "text",
  io
) => {
  const session = await mongoose.startSession();
  let committed = false;

  try {
    session.startTransaction();

    // console.log("sendMessage called with:", {
    //   conversationId,
    //   senderId,
    //   content,
    //   type,
    // });
    if (type === "text") {
      content = normalizeMyanmarText(content);
    }

    if (type === "text" && (!content || content.length > 500)) {
      throw new Error("Text message must be between 1 and 500 characters.");
    }

    if (
      type === "image" &&
      (!content || !content.match(/\.(jpeg|jpg|png|gif|webp)$/i))
    ) {
      throw new Error("Invalid image format.");
    }

    const conversation = await Conversation.findById(conversationId).session(
      session
    );
    if (!conversation) throw new Error("Conversation not found");

    const allowedIds = [
      conversation.user.toString(),
      conversation.admin?.toString(),
    ];
    if (!allowedIds.includes(senderId.toString()))
      throw new Error("Unauthorized sender");



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

    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      sender: { $ne: senderId },
      read: false,
    }).session(session);

    const recipientField =
      senderId.toString() === conversation.user.toString() ? "admin" : "user";

    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: msg._id,
        [`unreadCount.${recipientField}`]: unreadCount,
      },
      { session }
    );

    await session.commitTransaction();
    committed = true;
    session.endSession();

    const populatedMessage = await Message.populate(msg, {
      path: "sender",
      select: "name role",
    });

    if (io) {
      const receiverId =
        recipientField === "admin" ? conversation.admin : conversation.user;
      const recipient = await User.findById(receiverId);
      if (recipient?.socketId) {
        io.to(recipient.socketId).emit("receive_message", populatedMessage);
      }
    }

    return populatedMessage;
  } catch (error) {
    if (!committed) await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getConversationMessages = async (
  conversationId,
  userId,
  page = 1,
  limit = 10
) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [{ user: userId }, { admin: userId }],
  });

  if (!conversation) throw new Error("Conversation not found or unauthorized");

  const senderToMark =
    userId.toString() === conversation.admin?.toString()
      ? conversation.user
      : conversation.admin;
  const recipient =
    userId.toString() === conversation.admin?.toString() ? "admin" : "user";

  await Message.updateMany(
    { conversation: conversationId, sender: senderToMark, read: false },
    { $set: { read: true } }
  );

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCount.${recipient}`]: 0 },
  });

  const options = {
    page,
    limit,
    sort: { _id: -1 },
    populate: { path: "sender", select: "name role" },
  };

  return await Message.paginate({ conversation: conversationId }, options);
};

const getAdminConversations = async (adminId, app_name_id) => {
  return await Conversation.find({
    admin: adminId,
    app_name_id,
  })
    .populate("user", "name online")
    .populate("lastMessage")
    .sort("-updatedAt");
};

const adminDeleteMessage = async (messageId, userId) => {
  const session = await mongoose.startSession();
  let committed = false;

  try {
    session.startTransaction();

    const message = await Message.findById(messageId).session(session);
    if (!message) throw new Error("Message not found!");

    const conversation = await Conversation.findById(
      message.conversation
    ).session(session);
    if (!conversation) throw new Error("Conversation not found");

    // 🔒 Only admin can delete messages
    if (conversation.admin.toString() !== userId.toString()) {
      throw new Error("Only admin can delete messages");
    }

    await message.deleteOne({ session });

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
    committed = true;
    session.endSession();

    return { isSuccess: true };
  } catch (error) {
    if (!committed) await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const broadcastMessageFromAdmin = async (adminId, content, io) => {
  const session = await mongoose.startSession();
  let committed = false;

  try {
    session.startTransaction();

    const conversations = await Conversation.find({
      $or: [{ admin: adminId }, { admin: null }],
    }).session(session);

    const messages = [];

    for (const convo of conversations) {
      const message = new Message({
        conversation: convo._id,
        sender: adminId,
        content: normalizeMyanmarText(content),
        type: "text",
      });

      await message.save({ session });

      convo.lastMessage = message._id;
      convo.unreadCount.user += 1;
      await convo.save({ session });

      messages.push(message);

      const user = await User.findById(convo.user);
      if (user?.socketId) {
        io.to(user.socketId).emit("receive_message", message);
      }
    }

    await session.commitTransaction();
    committed = true;
    session.endSession();

    return messages;
  } catch (error) {
    if (!committed) await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getOrCreateConversationHandler = async (req, res) => {
  try {
    const conversation = await getOrCreateConversation(req.user._id);
    return res.status(200).json({
      isSuccess: true,
      message: "User conversation retrieved successfully",
      data: conversation,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

const getUserConversationMessagesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const conversation = await getOrCreateConversation(req.user._id);

    const paginatedResult = await getConversationMessages(
      conversation._id,
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      isSuccess: true,
      message: "Messages retrieved successfully.",
      data: paginatedResult,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

const sendUserMessageHandler = async (req, res) => {
  try {
    const io = req.app.get("io");
    const conversation = await getOrCreateConversation(req.user._id);
    let { type = "text", content } = req.body;
    if (req.file) {
      type = "image";
      content = `/uploads/${req.file.filename}`;
    }

    const message = await sendMessage(
      conversation._id,
      req.user._id,
      content,
      type,
      io
    );

    return res.status(201).json({
      isSuccess: true,
      message: "Message sent successfully.",
      data: message,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

const getAdminConversationsHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { updatedAt: -1 },
      populate: [
        { path: "user", select: "name online" },
        { path: "lastMessage" },
      ],
    };

    const conversations = await Conversation.paginate(
      {
        admin: req.user._id,
        app_name_id: req.user.app_name_id,
      },
      options
    );

    return res.status(200).json({
      isSuccess: true,
      message: "Admin conversations retrieved successfully.",
      data: conversations,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

const getAdminMessagesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const conversationId = req.params.conversationId;

    const paginatedResult = await getConversationMessages(
      conversationId,
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      isSuccess: true,
      message: "Messages retrieved successfully.",
      data: paginatedResult,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

const sendAdminMessageHandler = async (req, res) => {
  try {
    const io = req.app.get("io");
    let { content, type = "text" } = req.body;
    if (req.file) {
      content = `/uploads/${req.file.filename}`;
      type = "image";
    }

    const message = await sendMessage(
      req.params.conversationId,
      req.user._id,
      content,
      type,
      io
    );
    return res.status(201).json({
      isSuccess: true,
      message: "Admin message sent successfully.",
      data: message,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

const adminDeleteMessageHandler = async (req, res) => {
  try {
    const result = await adminDeleteMessage(req.params.messageId, req.user._id);
    return res.status(200).json({
      isSuccess: true,
      message: "Message deleted successfully.",
      data: result,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

const broadcastMessageHandler = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { content } = req.body;
    const messages = await broadcastMessageFromAdmin(req.user._id, content, io);
    return res.status(201).json({
      isSuccess: true,
      message: "Broadcast message sent to all conversations.",
      data: messages,
    });
  } catch (err) {
    return res.status(400).json({ isSuccess: false, message: err.message });
  }
};

module.exports = {
  getOrCreateConversationHandler,
  getUserConversationMessagesHandler,
  sendUserMessageHandler,
  getAdminConversationsHandler,
  getAdminMessagesHandler,
  sendAdminMessageHandler,
  adminDeleteMessageHandler,
  broadcastMessageHandler,
};
