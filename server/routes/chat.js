const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const {isAdmin} = require('../middleware/admin');
const { upload } = require('../utils/multerConfig');

// User routes
router.get('/conversation', authMiddleware, chatController.getOrCreateConversationHandler);
router.get('/conversation/messages', authMiddleware, chatController.getUserConversationMessagesHandler);
router.post('/message', authMiddleware, upload.single('image'), chatController.sendUserMessageHandler);

// Admin routes
router.get('/admin/conversations', authMiddleware,isAdmin, chatController.getAdminConversationsHandler);
router.get('/admin/conversations/:conversationId/messages', authMiddleware,isAdmin, chatController.getAdminMessagesHandler);
router.post('/admin/conversations/:conversationId/message', authMiddleware,isAdmin, upload.single('image'), chatController.sendAdminMessageHandler);
router.post('/admin/broadcast-message', authMiddleware, isAdmin, chatController.broadcastMessageHandler);

module.exports = router;
