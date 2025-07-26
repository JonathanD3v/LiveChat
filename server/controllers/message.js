const Message = require("../models/Message");

exports.getOldMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversation: conversationId })
      .select("sender content createdAt")
      .populate("sender", "name role")
      .sort("createdAt");

    res.status(200).json(messages);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch messages", error: err.message });
  }
};
