const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const gameController = require('../controllers/gameController');

router.get('/active', auth, gameController.getActiveGames);
router.get('/leaderboard', auth, gameController.getLeaderboard);
router.get('/history', auth, gameController.getGameHistory);
router.get('/:id', auth, gameController.getGameSession);

module.exports = router;
