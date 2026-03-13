import { motion } from 'framer-motion';

export default function TypingIndicator({ users }) {
    if (!users || users.length === 0) return null;

    const text = users.length === 1
        ? `${users[0].username} is typing...`
        : users.length === 2
            ? `${users[0].username} and ${users[1].username} are typing...`
            : `${users.length} people are typing...`;

    return (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-white/50 bg-dark-900/50 backdrop-blur-sm self-start rounded-r-full mb-2 ml-2">
            <div className="flex gap-1 items-center justify-center p-1">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="w-1 h-1 bg-white/50 rounded-full"
                        animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>
            <span className="font-medium">{text}</span>
        </div>
    );
}
