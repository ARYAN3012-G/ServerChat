const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const createDefaultServer = require('../utils/createDefaultServer');

// Admin email - only this account gets admin role
const ADMIN_EMAIL = 'aryanrajeshgadam.3012@gmail.com';

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Helper to handle OAuth login
const handleOAuthLogin = async (profile, provider, done) => {
    try {
        let user = await User.findOne({ [`${provider}Id`]: profile.id });

        if (user) {
            return done(null, user);
        }

        // If no user by provider ID, check if user exists by email
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        if (email) {
            user = await User.findOne({ email });
            if (user) {
                // Link the provider ID to existing account
                user[`${provider}Id`] = profile.id;
                // Auto-assign admin if this is the admin email
                if (email === ADMIN_EMAIL && user.role !== 'admin') {
                    user.role = 'admin';
                }
                await user.save();
                return done(null, user);
            }
        }

        // If no user exists, create a new one
        const username = profile.username || profile.displayName || email.split('@')[0];
        const newUsername = `${username}_${Math.floor(Math.random() * 10000)}`.replace(/\s+/g, '').toLowerCase();

        user = new User({
            username: newUsername,
            email: email,
            avatar: {
                url: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
                publicId: ''
            },
            role: email === ADMIN_EMAIL ? 'admin' : 'user',
            isEmailVerified: true,
            [`${provider}Id`]: profile.id,
            authProvider: 'oauth',
            preferences: { theme: 'dark', language: 'en', notifications: true }
        });

        await user.save();

        // Create default server for newly registered OAuth user
        createDefaultServer(user._id, user.username).catch(() => {});

        done(null, user);
    } catch (err) {
        done(err, null);
    }
};

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL || 'http://localhost:5000'}/api/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        return handleOAuthLogin(profile, 'google', done);
    }));
}

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL || 'http://localhost:5000'}/api/auth/github/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        return handleOAuthLogin(profile, 'github', done);
    }));
}

module.exports = passport;
