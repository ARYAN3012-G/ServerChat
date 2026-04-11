import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentGame: null,
    session: null,           // active session user is playing/spectating
    serverSessions: [],      // all sessions for current server
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

export const { setCurrentGame, setGameSession, updateGameState, setServerSessions, updateServerSession, setLeaderboard, setSpectatingSessionId, clearGame } = gameSlice.actions;
export default gameSlice.reducer;
