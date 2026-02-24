const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validateInput } = require('../middleware/validate');
const serverController = require('../controllers/serverController');

// Server CRUD
router.post('/', auth, validateInput, serverController.createServer);
router.get('/me', auth, serverController.getMyServers);
router.get('/discover', auth, serverController.discoverServers);
router.get('/:id', auth, serverController.getServer);
router.put('/:id', auth, validateInput, serverController.updateServer);
router.delete('/:id', auth, serverController.deleteServer);

// Join / Leave
router.post('/join/:inviteCode', auth, serverController.joinServer);
router.post('/:id/leave', auth, serverController.leaveServer);

// Invites
router.post('/:id/invite', auth, serverController.createInvite);

// Member management
router.put('/:id/members/role', auth, serverController.updateMemberRole);
router.delete('/:id/members/:userId', auth, serverController.kickMember);

module.exports = router;
