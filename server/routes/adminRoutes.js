const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminAuth, adminController.getDashboard);
router.get('/users', adminAuth, adminController.getUsers);
router.post('/ban/:userId', adminAuth, adminController.banUser);
router.post('/unban/:userId', adminAuth, adminController.unbanUser);
router.put('/role/:userId', adminAuth, adminController.changeRole);
router.get('/logs/login', adminAuth, adminController.getLoginLogs);
router.get('/logs/admin', adminAuth, adminController.getAdminLogs);
router.get('/logs/games', adminAuth, adminController.getGameActivity);

module.exports = router;
