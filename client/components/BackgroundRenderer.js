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

    // PREMIUM PRESETS
    if (bg === 'aurora') {
        return (
            <div className="fixed inset-0 z-[-100] overflow-hidden bg-[#0A0A1A]">
                <div className="absolute inset-0 opacity-40 mix-blend-screen"
                    style={{
                        background: 'radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.4) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.4) 0%, transparent 50%), radial-gradient(ellipse at center, rgba(59, 130, 246, 0.4) 0%, transparent 50%)',
                        filter: 'blur(60px)',
                    }}
                />
            </div>
        );
    }

    if (bg === 'particles') {
        return (
            <div className="fixed inset-0 z-[-100] overflow-hidden bg-[#040407]">
                <style>{`
                    @keyframes floatUp { 0% { transform: translateY(100vh) scale(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-10vh) scale(1.5); opacity: 0; } }
                    .particle { position: absolute; background: rgba(255, 255, 255, 0.5); border-radius: 50%; animation: floatUp linear infinite; }
                `}</style>
                {[...Array(30)].map((_, i) => (
                    <div key={i} className="particle"
                        style={{
                            left: `${Math.random() * 100}vw`,
                            width: `${Math.random() * 4 + 1}px`,
                            height: `${Math.random() * 4 + 1}px`,
                            animationDuration: `${Math.random() * 10 + 10}s`,
                            animationDelay: `${Math.random() * 10}s`,
                        }}
                    />
                ))}
            </div>
        );
    }

    if (bg === 'waves') {
        return (
            <div className="fixed inset-0 z-[-100] overflow-hidden bg-[#0f1019]">
                <style>{`
                    @keyframes waveMove { 0% { background-position-x: 0; } 100% { background-position-x: -100vw; } }
                    .wave-layer { position: absolute; bottom: 0; width: 200vw; height: 100%; background: repeating-radial-gradient(circle at 0 100%, rgba(99, 102, 241, 0.1) 0, rgba(99, 102, 241, 0.05) 50px, transparent 100px); animation: waveMove 20s linear infinite; }
                `}</style>
                <div className="wave-layer" style={{ height: '50vh', opacity: 0.8 }} />
                <div className="wave-layer" style={{ height: '70vh', opacity: 0.5, animationDuration: '30s', animationDirection: 'reverse' }} />
                <div className="wave-layer" style={{ height: '100vh', opacity: 0.3, animationDuration: '40s' }} />
            </div>
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
