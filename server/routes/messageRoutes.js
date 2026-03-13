const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.get('/channel/:channelId', auth, messageController.getMessages);
router.post('/channel/:channelId', auth, messageController.sendMessage);
router.get('/thread/:messageId', auth, messageController.getThread);
router.get('/pinned/:channelId', auth, messageController.getPinnedMessages);
router.get('/search', auth, messageController.searchMessages);
router.put('/:messageId', auth, messageController.editMessage);
router.delete('/:messageId', auth, messageController.deleteMessage);
router.post('/:messageId/react', auth, messageController.toggleReaction);
router.post('/:messageId/read', auth, messageController.markAsRead);

module.exports = router;
