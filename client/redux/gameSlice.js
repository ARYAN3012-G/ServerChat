import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentGame: null,
    session: null,
    leaderboard: [],
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
        setLeaderboard: (state, action) => {
            state.leaderboard = action.payload;
        },
        clearGame: (state) => {
            state.currentGame = null;
            state.session = null;
        },
    },
});

export const { setCurrentGame, setGameSession, updateGameState, setLeaderboard, clearGame } = gameSlice.actions;
export default gameSlice.reducer;
