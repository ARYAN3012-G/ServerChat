'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, logout, loadTokens } from '../redux/authSlice';
import api from '../services/api';

export function useAuth() {
    const dispatch = useDispatch();
    const { user, token, isAuthenticated, loading } = useSelector((state) => state.auth);

    useEffect(() => {
        const initAuth = async () => {
            dispatch(loadTokens());
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const { data } = await api.get('/auth/me');
                    dispatch(setCredentials({
                        user: data.user,
                        accessToken: storedToken,
                        refreshToken: localStorage.getItem('refreshToken'),
                    }));
                } catch (error) {
                    dispatch(logout());
                }
            }
        };
        initAuth();
    }, [dispatch]);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.require2FA) {
            return { require2FA: true, tempToken: data.tempToken };
        }
        dispatch(setCredentials(data));
        return data;
    };

    const register = async (username, email, password) => {
        const { data } = await api.post('/auth/register', { username, email, password });
        dispatch(setCredentials(data));
        return data;
    };

    const logoutUser = () => {
        dispatch(logout());
    };

    return {
        user,
        token,
        isAuthenticated,
        loading,
        login,
        register,
        logout: logoutUser,
    };
}
