const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const friendController = require('../controllers/friendController');

router.get('/', auth, friendController.getFriends);
router.get('/requests', auth, friendController.getRequests);
router.post('/request', auth, friendController.sendRequest);
router.put('/accept/:requestId', auth, friendController.acceptRequest);
router.put('/reject/:requestId', auth, friendController.rejectRequest);
router.delete('/:userId', auth, friendController.removeFriend);

module.exports = router;
