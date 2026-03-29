/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: "standalone",
    images: {
        domains: ['res.cloudinary.com', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
    },
    // Security headers for all pages
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(self), microphone=(self), geolocation=()',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://checkout.razorpay.com https://*.razorpay.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://media.tenor.com https://*.tenor.com https://media.giphy.com https://*.giphy.com https://*.razorpay.com",
                            "media-src 'self' data: blob: mediastream: https://res.cloudinary.com https://*.onrender.com https://www.soundhelix.com https://*.soundhelix.com https://*.saavncdn.com https://*.jiosaavn.com",
                            "connect-src 'self' http://localhost:* ws://localhost:* https://*.onrender.com wss://*.onrender.com https://accounts.google.com https://api.github.com https://res.cloudinary.com https://api.cloudinary.com https://tenor.googleapis.com https://api.tenor.com https://www.soundhelix.com https://api.razorpay.com https://*.razorpay.com https://lumberjack-cx.razorpay.com https://*.saavncdn.com https://*.jiosaavn.com",
                            "frame-src 'self' https://accounts.google.com https://github.com https://api.razorpay.com https://*.razorpay.com",
                            "worker-src 'self' blob:",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self' https://accounts.google.com https://github.com",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
    // Compression & performance
    compress: true,
    poweredByHeader: false,
};

module.exports = nextConfig;
