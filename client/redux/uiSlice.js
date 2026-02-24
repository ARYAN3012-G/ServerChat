import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    theme: 'dark',
    sidebarOpen: true,
    memberListOpen: true,
    modal: { type: null, data: null },
    activePanel: null, // 'thread', 'search', 'profile', 'settings'
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            if (typeof window !== 'undefined') {
                localStorage.setItem('theme', state.theme);
                document.documentElement.classList.toggle('dark', state.theme === 'dark');
            }
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
            if (typeof window !== 'undefined') {
                document.documentElement.classList.toggle('dark', action.payload === 'dark');
            }
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        toggleMemberList: (state) => {
            state.memberListOpen = !state.memberListOpen;
        },
        openModal: (state, action) => {
            state.modal = action.payload;
        },
        closeModal: (state) => {
            state.modal = { type: null, data: null };
        },
        setActivePanel: (state, action) => {
            state.activePanel = action.payload;
        },
    },
});

export const {
    toggleTheme, setTheme, toggleSidebar, toggleMemberList,
    openModal, closeModal, setActivePanel,
} = uiSlice.actions;
export default uiSlice.reducer;
