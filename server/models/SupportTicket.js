const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: String, // 'user', 'ai', 'admin'
        required: true,
        enum: ['user', 'ai', 'admin']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() { return this.sender !== 'ai'; }
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const supportTicketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'escalated', 'closed'],
        default: 'open'
    },
    subject: {
        type: String,
        required: true
    },
    messages: [messageSchema],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Admin handling the ticket
    }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
