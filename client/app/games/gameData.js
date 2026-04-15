export const GAMES = [
    // Solo
    { id: 'snake', name: 'Snake', desc: 'Eat, grow, survive', gradient: 'from-lime-600 via-green-500 to-emerald-500', glow: 'shadow-green-500/30', icon: '🐍', category: 'solo', players: '1' },
    { id: 'memory', name: 'Memory Match', desc: 'Find matching pairs', gradient: 'from-emerald-600 via-teal-500 to-cyan-500', glow: 'shadow-teal-500/30', icon: '🧠', category: 'solo', players: '1' },
    { id: '2048', name: '2048', desc: 'Merge tiles to 2048', gradient: 'from-amber-600 via-orange-500 to-red-500', glow: 'shadow-orange-500/30', icon: '🔢', category: 'solo', players: '1' },
    { id: 'minesweeper', name: 'Minesweeper', desc: 'Clear the minefield', gradient: 'from-slate-600 via-gray-500 to-zinc-500', glow: 'shadow-gray-500/30', icon: '💣', category: 'solo', players: '1' },
    { id: 'wordle', name: 'Wordle', desc: 'Guess the 5-letter word', gradient: 'from-green-600 via-emerald-500 to-teal-500', glow: 'shadow-emerald-500/30', icon: '📝', category: 'solo', players: '1' },
    { id: 'flappy', name: 'Flappy Bird', desc: 'Tap to fly through pipes', gradient: 'from-sky-600 via-cyan-500 to-blue-500', glow: 'shadow-sky-500/30', icon: '🐦', category: 'solo', players: '1' },
    { id: 'tetris', name: 'Tetris', desc: 'Stack and clear lines', gradient: 'from-purple-600 via-violet-500 to-indigo-500', glow: 'shadow-purple-500/30', icon: '🧱', category: 'solo', players: '1' },
    // vs CPU / 2 Player
    { id: 'ttt', name: 'Tic-Tac-Toe', desc: 'Classic 3×3 strategy', gradient: 'from-violet-600 via-indigo-500 to-blue-500', glow: 'shadow-indigo-500/30', icon: '🎯', category: 'versus', players: '1-2', modes: ['cpu', '2player'] },
    { id: 'rps', name: 'Rock Paper Scissors', desc: 'Best of rounds', gradient: 'from-rose-600 via-pink-500 to-fuchsia-500', glow: 'shadow-pink-500/30', icon: '⚔️', category: 'versus', players: '1', modes: ['cpu'] },
    { id: 'pong', name: 'Ping Pong', desc: 'Classic paddle game', gradient: 'from-cyan-600 via-blue-500 to-indigo-500', glow: 'shadow-blue-500/30', icon: '🏓', category: 'versus', players: '1-2', modes: ['cpu', '2player'] },
    { id: 'connect4', name: 'Connect 4', desc: 'Drop 4 in a row', gradient: 'from-red-600 via-rose-500 to-pink-500', glow: 'shadow-red-500/30', icon: '🔴', category: 'versus', players: '2', modes: ['cpu', '2player'] },
    // Multiplayer
    { id: 'chess', name: 'Chess', desc: 'The ultimate strategy', gradient: 'from-neutral-700 via-stone-600 to-zinc-500', glow: 'shadow-neutral-500/30', icon: '♟️', category: 'multi', players: '2', modes: ['cpu', '2player'] },
    { id: 'checkers', name: 'Checkers', desc: 'Jump and capture', gradient: 'from-red-700 via-orange-600 to-amber-500', glow: 'shadow-orange-500/30', icon: '🏁', category: 'multi', players: '2', modes: ['cpu', '2player'] },
    { id: 'battleship', name: 'Battleship', desc: 'Sink the fleet', gradient: 'from-blue-700 via-indigo-600 to-violet-500', glow: 'shadow-indigo-500/30', icon: '🚢', category: 'multi', players: '2', modes: ['cpu'] },
    { id: 'ludo', name: 'Ludo', desc: 'Race to the finish', gradient: 'from-yellow-600 via-amber-500 to-orange-500', glow: 'shadow-amber-500/30', icon: '🎲', category: 'multi', players: '2-4', modes: ['cpu'] },
];

export const CATEGORIES = [
    { id: 'all', label: '🎮 All Games' },
    { id: 'solo', label: '🧩 Solo' },
    { id: 'versus', label: '⚔️ vs CPU / 2P' },
    { id: 'multi', label: '👥 Multiplayer' },
];

export const MEMORY_ICONS = ['🎮', '🎲', '🎯', '🏆', '⭐', '💎', '🔥', '🚀'];

export const getHighScore = (game) => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(`hs_${game}`) || '0');
};

export const setHighScore = (game, score) => {
    const current = getHighScore(game);
    if (score > current) { localStorage.setItem(`hs_${game}`, score.toString()); return true; }
    return false;
};

// Sync high scores from backend DB into localStorage (survives storage clears)
export const syncHighScoresFromServer = async (api) => {
    try {
        const { data } = await api.get('/games/my-best-scores');
        if (data?.scores) {
            for (const [game, score] of Object.entries(data.scores)) {
                const local = getHighScore(game);
                if (score > local) {
                    localStorage.setItem(`hs_${game}`, score.toString());
                }
            }
        }
        return data?.scores || {};
    } catch (e) {
        return {};
    }
};
