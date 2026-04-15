const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const gameController = require('../controllers/gameController');

router.post('/save-score', auth, gameController.saveScore);
router.get('/active', auth, gameController.getActiveGames);
router.get('/leaderboard', auth, gameController.getLeaderboard);
router.get('/history', auth, gameController.getGameHistory);
router.get('/my-best-scores', auth, gameController.getMyBestScores);
router.get('/server/:serverId', auth, gameController.getServerSessions);
router.get('/:id', auth, gameController.getGameSession);

module.exports = router;
