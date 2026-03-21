'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiMessageSquare, FiMail, FiPhone, FiSend, FiCheck } from 'react-icons/fi';

export default function Contact() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Open default mail client with pre-filled values
        const mailto = `mailto:aryanrajeshgadam.3012@gmail.com?subject=${encodeURIComponent(subject || 'ServerChat Support')}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
        window.open(mailto, '_blank');
        setSent(true);
        setTimeout(() => setSent(false), 3000);
    };

    return (
        <div className="min-h-screen bg-[#0d0d1a] text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0d0d1a]/90 backdrop-blur-md border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <FiMessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg">ServerChat</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <div className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Contact Us</h1>
                    <p className="text-white/40">Have a question, issue, or feedback? We'd love to hear from you.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-4">
                        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
                            <h2 className="text-lg font-semibold mb-5">Get in Touch</h2>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                        <FiMail className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-0.5">Email</p>
                                        <a href="mailto:aryanrajeshgadam.3012@gmail.com" className="text-sm text-white hover:text-indigo-400 transition-colors break-all">
                                            aryanrajeshgadam.3012@gmail.com
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <FiPhone className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-0.5">Phone</p>
                                        <a href="tel:+919704563437" className="text-sm text-white hover:text-emerald-400 transition-colors">
                                            +91 9704563437
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
                            <h2 className="text-lg font-semibold mb-3">Support Topics</h2>
                            <ul className="space-y-2 text-sm text-white/50">
                                {['Account issues', 'Billing & subscription', 'Technical problems', 'Feature requests', 'Report abuse or spam', 'Refund requests'].map(t => (
                                    <li key={t} className="flex items-center gap-2 before:content-['›'] before:text-indigo-400">{t}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
                        <h2 className="text-lg font-semibold mb-5">Send a Message</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Your Name</label>
                                <input
                                    value={name} onChange={e => setName(e.target.value)} required
                                    placeholder="Aryan Gadam"
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Your Email</label>
                                <input
                                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                    placeholder="you@example.com"
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Subject</label>
                                <input
                                    value={subject} onChange={e => setSubject(e.target.value)}
                                    placeholder="Billing issue, account help..."
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Message</label>
                                <textarea
                                    value={message} onChange={e => setMessage(e.target.value)} required rows={5}
                                    placeholder="Describe your issue or question in detail..."
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none placeholder-white/20"
                                />
                            </div>
                            <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20">
                                {sent ? <><FiCheck className="w-4 h-4" /> Opening Email Client...</> : <><FiSend className="w-4 h-4" /> Send Message</>}
                            </button>
                            <p className="text-xs text-white/20 text-center">This will open your email client. We typically respond within 24 hours.</p>
                        </form>
                    </motion.div>
                </div>

                <div className="mt-12 text-center space-x-6 text-sm text-white/30">
                    <button onClick={() => router.push('/terms')} className="hover:text-white transition-colors">Terms of Service</button>
                    <button onClick={() => router.push('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
                    <button onClick={() => router.push('/')} className="hover:text-white transition-colors">Home</button>
                </div>
            </div>
        </div>
    );
}
