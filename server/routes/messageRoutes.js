const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.get('/channel/:channelId', auth, messageController.getMessages);
router.get('/thread/:messageId', auth, messageController.getThread);
router.get('/pinned/:channelId', auth, messageController.getPinnedMessages);
router.get('/search', auth, messageController.searchMessages);

module.exports = router;
