const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const supportController = require('../controllers/supportController');

// User routes
router.get('/active', auth, supportController.getActiveTicket);
router.post('/message', auth, supportController.sendMessage);
router.post('/escalate', auth, supportController.escalateTicket);
router.post('/close', auth, supportController.closeTicket);
router.post('/new', auth, supportController.newTicket);
router.get('/my-tickets', auth, supportController.getMyTickets);

// Admin routes
router.get('/admin/tickets', auth, supportController.adminGetTickets);
router.get('/admin/tickets/:id', auth, supportController.adminGetTicket);
router.post('/admin/tickets/:id/reply', auth, supportController.adminReply);
router.post('/admin/tickets/:id/resolve', auth, supportController.adminResolveTicket);

module.exports = router;
