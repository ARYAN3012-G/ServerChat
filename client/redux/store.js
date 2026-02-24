import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import chatReducer from './chatSlice';
import uiReducer from './uiSlice';
import gameReducer from './gameSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        chat: chatReducer,
        ui: uiReducer,
        game: gameReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['chat/setSocket'],
                ignoredPaths: ['chat.socket'],
            },
        }),
});
