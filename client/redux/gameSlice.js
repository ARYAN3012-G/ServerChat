import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentGame: null,
    session: null,
    serverSessions: [],
    leaderboard: [],
    spectatingSessionId: null,
};

const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        setCurrentGame: (state, action) => {
            state.currentGame = action.payload;
        },
        setGameSession: (state, action) => {
            state.session = action.payload;
        },
        updateGameState: (state, action) => {
            if (state.session) {
                state.session = { ...state.session, ...action.payload };
            }
        },
        setServerSessions: (state, action) => {
            state.serverSessions = action.payload;
        },
        updateServerSession: (state, action) => {
            const updated = action.payload;
            if (!updated?._id) return;
            const idx = state.serverSessions.findIndex(s => s._id === updated._id);
            if (idx >= 0) {
                state.serverSessions[idx] = updated;
            } else {
                state.serverSessions.unshift(updated);
            }
            // Also update active session if it matches
            if (state.session?._id === updated._id) {
                state.session = updated;
            }
        },
        removeServerSession: (state, action) => {
            const sessionId = typeof action.payload === 'string' ? action.payload : action.payload?._id;
            if (!sessionId) return;
            state.serverSessions = state.serverSessions.filter(s => s._id !== sessionId);
            // Clear active session if it was cancelled
            if (state.session?._id === sessionId) {
                state.session = null;
                state.spectatingSessionId = null;
            }
        },
        setLeaderboard: (state, action) => {
            state.leaderboard = action.payload;
        },
        setSpectatingSessionId: (state, action) => {
            state.spectatingSessionId = action.payload;
        },
        clearGame: (state) => {
            state.currentGame = null;
            state.session = null;
            state.spectatingSessionId = null;
        },
    },
});

export const { setCurrentGame, setGameSession, updateGameState, setServerSessions, updateServerSession, removeServerSession, setLeaderboard, setSpectatingSessionId, clearGame } = gameSlice.actions;
export default gameSlice.reducer;
