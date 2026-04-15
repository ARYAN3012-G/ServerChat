'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

export default function BackgroundEffect() {
    const { user } = useSelector(state => state.auth);
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const [bg, setBg] = useState('');

    useEffect(() => {
        setBg(user?.preferences?.background || '');
    }, [user?.preferences?.background]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !bg || bg.startsWith('http')) return;

        const ctx = canvas.getContext('2d');
        let W, H;
        const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        // ── STARS ──
        if (bg === 'stars') {
            const stars = Array.from({ length: 120 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                r: Math.random() * 1.5 + 0.3, speed: Math.random() * 0.3 + 0.05,
                opacity: Math.random() * 0.7 + 0.3, twinkle: Math.random() * Math.PI * 2,
            }));
            const draw = () => {
                ctx.clearRect(0, 0, W, H);
                stars.forEach(s => {
                    s.twinkle += 0.02;
                    s.y -= s.speed;
                    if (s.y < -5) { s.y = H + 5; s.x = Math.random() * W; }
                    const a = s.opacity * (0.5 + 0.5 * Math.sin(s.twinkle));
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(180,200,255,${a})`;
                    ctx.fill();
                });
                rafRef.current = requestAnimationFrame(draw);
            };
            draw();
        }

        // ── MATRIX ──
        if (bg === 'matrix') {
            const fontSize = 14;
            const cols = Math.floor(W / fontSize);
            const drops = Array(cols).fill(1);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789';
            const draw = () => {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = '#0f0';
                ctx.font = `${fontSize}px monospace`;
                for (let i = 0; i < drops.length; i++) {
                    const ch = chars[Math.floor(Math.random() * chars.length)];
                    ctx.globalAlpha = Math.random() * 0.3 + 0.1;
                    ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
                    if (drops[i] * fontSize > H && Math.random() > 0.975) drops[i] = 0;
                    drops[i]++;
                }
                ctx.globalAlpha = 1;
                rafRef.current = requestAnimationFrame(draw);
            };
            draw();
        }

        // ── CYBERPUNK ──
        if (bg === 'cyberpunk') {
            const lines = Array.from({ length: 30 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                len: Math.random() * 100 + 50, speed: Math.random() * 2 + 0.5,
                hue: Math.random() * 60 + 280, // purple-pink range
                alpha: Math.random() * 0.3 + 0.1,
            }));
            const draw = () => {
                ctx.fillStyle = 'rgba(0,0,0,0.03)';
                ctx.fillRect(0, 0, W, H);
                lines.forEach(l => {
                    l.x += l.speed;
                    if (l.x > W + l.len) { l.x = -l.len; l.y = Math.random() * H; }
                    const grad = ctx.createLinearGradient(l.x, l.y, l.x + l.len, l.y);
                    grad.addColorStop(0, `hsla(${l.hue},100%,60%,0)`);
                    grad.addColorStop(0.5, `hsla(${l.hue},100%,60%,${l.alpha})`);
                    grad.addColorStop(1, `hsla(${l.hue},100%,60%,0)`);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(l.x, l.y);
                    ctx.lineTo(l.x + l.len, l.y);
                    ctx.stroke();
                });
                rafRef.current = requestAnimationFrame(draw);
            };
            draw();
        }

        // ── AURORA (premium) ──
        if (bg === 'aurora') {
            let t = 0;
            const draw = () => {
                t += 0.003;
                ctx.fillStyle = 'rgba(0,0,0,0.02)';
                ctx.fillRect(0, 0, W, H);
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, H * 0.3);
                    for (let x = 0; x <= W; x += 5) {
                        const y = H * 0.3 + Math.sin(x * 0.003 + t + i * 2) * 80 + Math.sin(x * 0.007 + t * 1.5) * 40;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(W, H);
                    ctx.lineTo(0, H);
                    ctx.closePath();
                    const hue = 120 + i * 40 + Math.sin(t) * 30;
                    ctx.fillStyle = `hsla(${hue},70%,50%,0.03)`;
                    ctx.fill();
                }
                rafRef.current = requestAnimationFrame(draw);
            };
            draw();
        }

        // ── PARTICLES (premium) ──
        if (bg === 'particles') {
            const pts = Array.from({ length: 60 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
                r: Math.random() * 2 + 1,
            }));
            const draw = () => {
                ctx.clearRect(0, 0, W, H);
                pts.forEach(p => {
                    p.x += p.vx; p.y += p.vy;
                    if (p.x < 0 || p.x > W) p.vx *= -1;
                    if (p.y < 0 || p.y > H) p.vy *= -1;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(99,102,241,0.4)';
                    ctx.fill();
                });
                // Draw connections
                for (let i = 0; i < pts.length; i++) {
                    for (let j = i + 1; j < pts.length; j++) {
                        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                        const d = Math.sqrt(dx * dx + dy * dy);
                        if (d < 120) {
                            ctx.beginPath();
                            ctx.moveTo(pts[i].x, pts[i].y);
                            ctx.lineTo(pts[j].x, pts[j].y);
                            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - d / 120)})`;
                            ctx.stroke();
                        }
                    }
                }
                rafRef.current = requestAnimationFrame(draw);
            };
            draw();
        }

        // ── WAVES (premium) ──
        if (bg === 'waves') {
            let t = 0;
            const draw = () => {
                t += 0.01;
                ctx.clearRect(0, 0, W, H);
                for (let w = 0; w < 4; w++) {
                    ctx.beginPath();
                    ctx.moveTo(0, H);
                    for (let x = 0; x <= W; x += 3) {
                        const y = H * (0.6 + w * 0.1) + Math.sin(x * 0.005 + t + w * 1.5) * 30 + Math.sin(x * 0.01 + t * 0.7) * 15;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(W, H);
                    ctx.closePath();
                    ctx.fillStyle = `rgba(99,102,241,${0.04 - w * 0.008})`;
                    ctx.fill();
                }
                rafRef.current = requestAnimationFrame(draw);
            };
            draw();
        }

        return () => {
            window.removeEventListener('resize', resize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [bg]);

    // No background or URL-based background
    if (!bg) return null;

    // URL-based custom background (for Pro users)
    if (bg.startsWith('http')) {
        return (
            <div className="fixed inset-0 z-0 pointer-events-none" style={{
                backgroundImage: `url(${bg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.15,
            }} />
        );
    }

    // Canvas-based preset backgrounds
    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ opacity: 0.6 }}
        />
    );
}
