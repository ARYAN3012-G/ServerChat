import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: true,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user, accessToken, refreshToken } = action.payload;
            state.user = user;
            state.token = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
            state.loading = false;
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
            }
        },
        updateUser: (state, action) => {
            state.user = { ...state.user, ...action.payload };
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.loading = false;
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
            }
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        loadTokens: (state) => {
            if (typeof window !== 'undefined') {
                state.token = localStorage.getItem('token');
                state.refreshToken = localStorage.getItem('refreshToken');
                state.isAuthenticated = !!state.token;
            }
            state.loading = false;
        },
    },
});

export const { setCredentials, updateUser, logout, setLoading, loadTokens } = authSlice.actions;
export default authSlice.reducer;
