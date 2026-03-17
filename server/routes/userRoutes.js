const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const userController = require('../controllers/userController');

router.get('/search', auth, userController.searchUsers);
router.get('/online', auth, userController.getOnlineUsers);
router.get('/activity', auth, userController.getActivityHistory);
router.get('/blocked', auth, userController.getBlockedUsers);
router.get('/:id', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/avatar', auth, upload.single('avatar'), userController.uploadAvatar);
router.post('/block/:userId', auth, userController.blockUser);
router.delete('/block/:userId', auth, userController.unblockUser);

module.exports = router;
