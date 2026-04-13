const Server = require('../models/Server');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { logger } = require('../config/logger');

/**
 * Creates a default personal server for a newly registered user.
 * Called from both regular registration and OAuth signup.
 * 
 * Channels created:
 *   Text:  general, integration (bot chat)
 *   Voice: General Voice, Music
 */
async function createDefaultServer(userId, username) {
    try {
        const serverName = `${username}'s Server`;

        // 1. Create the server
        const server = await Server.create({
            name: serverName,
            description: `Welcome to ${username}'s server! This is your personal space.`,
            isPublic: true,
            owner: userId,
            members: [{
                user: userId,
                role: 'owner',
                joinedAt: new Date(),
            }],
            memberCount: 1,
        });

        // 2. Create text channels
        const generalChannel = await Channel.create({
            name: 'general',
            description: 'General discussion — say hi!',
            type: 'text',
            server: server._id,
            owner: userId,
            category: 'Text Channels',
            members: [{ user: userId, role: 'owner' }],
        });

        const integrationChannel = await Channel.create({
            name: 'integration',
            description: 'Chat with the bot — try commands like /help',
            type: 'text',
            server: server._id,
            owner: userId,
            category: 'Text Channels',
            members: [{ user: userId, role: 'owner' }],
        });

        // 3. Create voice channels
        const generalVoice = await Channel.create({
            name: 'General Voice',
            description: 'Hang out and talk',
            type: 'voice',
            server: server._id,
            owner: userId,
            category: 'Voice Channels',
            members: [{ user: userId, role: 'owner' }],
        });

        const musicVoice = await Channel.create({
            name: 'Music',
            description: 'Listen to music together',
            type: 'voice',
            server: server._id,
            owner: userId,
            category: 'Voice Channels',
            members: [{ user: userId, role: 'owner' }],
        });

        // 4. Set up server channels and categories
        server.channels.push(
            generalChannel._id,
            integrationChannel._id,
            generalVoice._id,
            musicVoice._id
        );

        server.systemChannel = generalChannel._id;

        server.categories = [
            {
                name: 'Text Channels',
                position: 0,
                channels: [generalChannel._id, integrationChannel._id],
            },
            {
                name: 'Voice Channels',
                position: 1,
                channels: [generalVoice._id, musicVoice._id],
            },
        ];

        await server.save();

        // 5. Send a welcome message in #general
        await Message.create({
            content: `👋 Welcome to **${serverName}**!\n\nThis is your personal server. Here's what you can do:\n\n💬 **#general** — Chat with friends\n🤖 **#integration** — Chat with the bot\n🔊 **General Voice** — Voice chat\n🎵 **Music** — Listen together\n\nInvite friends using the invite code in server settings!`,
            sender: userId,
            channel: generalChannel._id,
            type: 'system',
        });

        // 6. Send a bot welcome in #integration
        await Message.create({
            content: `🤖 **Welcome to the Integration channel!**\n\nYou can chat with the bot here. Try these commands:\n\n• \`/help\` — Show available commands\n• \`/joke\` — Get a random joke\n• \`/quote\` — Get an inspirational quote\n• \`/weather <city>\` — Check the weather\n• \`/flip\` — Flip a coin\n• \`/roll <sides>\` — Roll a dice\n\nMore features coming soon! 🚀`,
            sender: userId,
            channel: integrationChannel._id,
            type: 'system',
        });

        logger.info(`Created default server "${serverName}" for user ${userId}`);
        return server;
    } catch (error) {
        // Don't fail registration if server creation fails
        logger.error(`Failed to create default server for ${userId}: ${error.message}`);
        return null;
    }
}

module.exports = createDefaultServer;
