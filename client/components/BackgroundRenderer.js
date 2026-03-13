'use client';

import { useSelector } from 'react-redux';

export default function BackgroundRenderer() {
    const { user } = useSelector(state => state.auth);
    const bg = user?.preferences?.background;

    if (!bg) return null;

    // Presets
    if (bg === 'stars') {
        return (
            <div className="fixed inset-0 z-[-100] overflow-hidden bg-[#040407]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 mix-blend-screen" />
            </div>
        );
    }

    if (bg === 'matrix') {
        return (
            <div className="fixed inset-0 z-[-100] overflow-hidden bg-black">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(0, 255, 0, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.2) 1px, transparent 1px)", backgroundSize: '20px 20px' }} />
                <div className="absolute inset-x-0 inset-y-1/4 text-green-500 font-mono text-center text-opacity-10 opacity-30 select-none text-[20vw] blur-[2px] mix-blend-screen overflow-hidden pointer-events-none">0 1 0 1</div>
            </div>
        );
    }

    if (bg === 'cyberpunk') {
        return (
            <div className="fixed inset-0 z-[-100] bg-gradient-to-br from-indigo-900/60 via-purple-900/60 to-fuchsia-900/60" />
        );
    }

    // Custom Image / GIF
    return (
        <div className="fixed inset-0 z-[-100]">
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${bg})` }}
            />
            <div className="absolute inset-0 bg-[#040407]/70 backdrop-blur-[2px]" />
        </div>
    );
}
