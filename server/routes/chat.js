const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

router.post('/message', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const conversation = await chatController.getOrCreateConversation(req.user._id);

    let type = req.body.type;
    let content = req.body.content;

    if (req.file) {
      type = 'image';
      content = `/uploads/${req.file.filename}`;
    }

    if (!type) type = 'text';

    const message = await chatController.sendMessage(
      conversation._id,
      req.user._id,
      content,
      type
    );

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

// Admin sending message (with optional image)
router.post('/admin/conversation/:conversationId/message', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { content, type } = req.body;
    let msgContent = content;
    let msgType = type;

    if (req.file) {
      msgContent = `/uploads/${req.file.filename}`;
      msgType = 'image';
    }

    const message = await chatController.sendMessage(req.params.conversationId, req.user._id, msgContent, msgType);
    res.json(message);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


module.exports = router;