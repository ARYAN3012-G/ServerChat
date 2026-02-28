/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
        './pages/**/*.{js,jsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                dark: {
                    50: '#f8fafc',
                    100: '#e2e8f0',
                    200: '#cbd5e1',
                    300: '#8b95a5',
                    400: '#5c6578',
                    500: '#3d4556',
                    600: '#252a35',
                    700: '#1a1e28',
                    800: '#111420',
                    900: '#0c0e1a',
                    950: '#070912',
                },
                discord: {
                    blurple: '#5865F2',
                    green: '#57F287',
                    yellow: '#FEE75C',
                    fuchsia: '#EB459E',
                    red: '#ED4245',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'system-ui', 'sans-serif'],
            },
            animation: {
                'slide-in': 'slideIn 0.3s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
                'bounce-in': 'bounceIn 0.5s ease-out',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                slideIn: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                bounceIn: {
                    '0%': { transform: 'scale(0.3)', opacity: '0' },
                    '50%': { transform: 'scale(1.05)' },
                    '70%': { transform: 'scale(0.9)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.5)' },
                    '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.8)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
};
