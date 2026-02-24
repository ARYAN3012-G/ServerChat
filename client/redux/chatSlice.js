import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    channels: [],
    currentChannel: null,
    messages: [],
    directMessages: [],
    typingUsers: {},
    onlineUsers: [],
    unreadCounts: {},
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setChannels: (state, action) => {
            state.channels = action.payload;
        },
        setCurrentChannel: (state, action) => {
            state.currentChannel = action.payload;
        },
        addChannel: (state, action) => {
            state.channels.push(action.payload);
        },
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        updateMessage: (state, action) => {
            const index = state.messages.findIndex(m => m._id === action.payload._id);
            if (index !== -1) state.messages[index] = action.payload;
        },
        removeMessage: (state, action) => {
            state.messages = state.messages.filter(m => m._id !== action.payload);
        },
        setTypingUser: (state, action) => {
            const { channelId, userId, username, isTyping } = action.payload;
            if (!state.typingUsers[channelId]) state.typingUsers[channelId] = {};
            if (isTyping) {
                state.typingUsers[channelId][userId] = username;
            } else {
                delete state.typingUsers[channelId][userId];
            }
        },
        setOnlineUsers: (state, action) => {
            state.onlineUsers = action.payload;
        },
        addOnlineUser: (state, action) => {
            if (!state.onlineUsers.includes(action.payload)) {
                state.onlineUsers.push(action.payload);
            }
        },
        removeOnlineUser: (state, action) => {
            state.onlineUsers = state.onlineUsers.filter(id => id !== action.payload);
        },
        setUnreadCount: (state, action) => {
            const { channelId, count } = action.payload;
            state.unreadCounts[channelId] = count;
        },
        updateReactions: (state, action) => {
            const { messageId, reactions } = action.payload;
            const msg = state.messages.find(m => m._id === messageId);
            if (msg) msg.reactions = reactions;
        },
    },
});

export const {
    setChannels, setCurrentChannel, addChannel,
    setMessages, addMessage, updateMessage, removeMessage,
    setTypingUser, setOnlineUsers, addOnlineUser, removeOnlineUser,
    setUnreadCount, updateReactions,
} = chatSlice.actions;
export default chatSlice.reducer;
