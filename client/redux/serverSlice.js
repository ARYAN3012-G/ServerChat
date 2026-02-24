import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    servers: [],
    currentServer: null,
    loading: false,
    error: null,
};

const serverSlice = createSlice({
    name: 'server',
    initialState,
    reducers: {
        setServers: (state, action) => {
            state.servers = action.payload;
            state.loading = false;
        },
        setCurrentServer: (state, action) => {
            state.currentServer = action.payload;
        },
        addServer: (state, action) => {
            state.servers.push(action.payload);
        },
        removeServer: (state, action) => {
            state.servers = state.servers.filter(s => s._id !== action.payload);
            if (state.currentServer?._id === action.payload) {
                state.currentServer = state.servers[0] || null;
            }
        },
        updateServer: (state, action) => {
            const idx = state.servers.findIndex(s => s._id === action.payload._id);
            if (idx !== -1) {
                state.servers[idx] = { ...state.servers[idx], ...action.payload };
            }
            if (state.currentServer?._id === action.payload._id) {
                state.currentServer = { ...state.currentServer, ...action.payload };
            }
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
    },
});

export const {
    setServers,
    setCurrentServer,
    addServer,
    removeServer,
    updateServer,
    setLoading,
    setError,
} = serverSlice.actions;
export default serverSlice.reducer;
