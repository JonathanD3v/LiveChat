const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const { compareSync } = require('bcrypt');

// User routes
router.get('/conversation', authMiddleware, async (req, res) => {
  try {
    const conversation = await chatController.getOrCreateConversation(req.user._id);
    res.json(conversation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/conversation/messages', authMiddleware, async (req, res) => {
  try {
    const conversation = await chatController.getOrCreateConversation(req.user._id);
    const messages = await chatController.getConversationMessages(conversation._id, req.user._id);
    res.json(messages);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/message', authMiddleware, async (req, res) => {
  try {
    const conversation = await chatController.getOrCreateConversation(req.user._id);
    const message = await chatController.sendMessage(conversation._id, req.user._id, req.body.content);
    res.json(message);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin routes
router.get('/admin/conversations', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const conversations = await chatController.getAdminConversations(req.user._id);
    res.json(conversations);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/admin/conversation/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const messages = await chatController.getConversationMessages(req.params.conversationId, req.user._id);
    res.json(messages);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/admin/conversation/:conversationId/message', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const message = await chatController.sendMessage(req.params.conversationId, req.user._id, req.body.content);
    res.json(message);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;