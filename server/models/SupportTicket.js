const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'ai', 'admin'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const supportTicketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['ai-chat', 'escalated', 'in-progress', 'resolved', 'closed'],
        default: 'ai-chat',
    },
    subject: {
        type: String,
        default: 'Support Request',
    },
    messages: [supportMessageSchema],
    assignedAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
    resolvedAt: Date,
    lastActivity: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ status: 1, lastActivity: -1 });
supportTicketSchema.index({ assignedAdmin: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
