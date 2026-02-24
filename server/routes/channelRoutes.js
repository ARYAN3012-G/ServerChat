const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const channelController = require('../controllers/channelController');

router.get('/', auth, channelController.getChannels);
router.get('/me', auth, channelController.getMyChannels);
router.get('/:id', auth, channelController.getChannel);
router.post('/', auth, channelController.createChannel);
router.put('/:id', auth, channelController.updateChannel);
router.delete('/:id', auth, channelController.deleteChannel);
router.post('/:id/join', auth, channelController.joinChannel);
router.post('/:id/leave', auth, channelController.leaveChannel);
router.post('/dm', auth, channelController.createDM);

module.exports = router;
