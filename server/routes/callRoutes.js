const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const callController = require('../controllers/callController');

router.post('/start', auth, callController.startCall);
router.post('/:id/end', auth, callController.endCall);
router.post('/:id/join', auth, callController.joinCall);
router.get('/history', auth, callController.getCallHistory);
router.get('/active', auth, callController.getActiveCalls);

module.exports = router;
