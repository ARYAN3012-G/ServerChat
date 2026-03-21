'use client';

import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiMessageSquare } from 'react-icons/fi';

export default function PrivacyPolicy() {
    const router = useRouter();

    const sections = [
        {
            title: '1. Information We Collect',
            content: `We collect information you provide directly to us when you:\n\n• Create an account (username, email address, optional phone number)\n• Update your profile (bio, avatar, custom banner, status)\n• Send messages or upload files through the Service\n• Subscribe to ServerChat Pro (payment details are processed by Razorpay, we do not store card numbers)\n• Register a Face ID for login purposes (facial descriptor data is stored in encrypted form)\n\nWe also automatically collect certain technical information, including your IP address, browser type, device type, and usage data.`,
        },
        {
            title: '2. How We Use Your Information',
            content: `We use the information we collect to:\n\n• Provide, maintain, and improve the Service\n• Process your ServerChat Pro subscription payments\n• Send you technical notices and support messages\n• Monitor and analyse trends and usage of the Service\n• Detect, investigate, and prevent fraudulent transactions and other illegal activities\n• Personalise your experience on the Service`,
        },
        {
            title: '3. Information Sharing',
            content: `We do not sell, trade, or rent your personal information to third parties. We may share your information with:\n\n• Razorpay: For processing subscription payments securely. Razorpay's privacy policy governs the use of payment information.\n• Cloudinary: For securely storing uploaded media files (avatars, attachments).\n• Service Providers: Trusted third-party vendors who assist us in operating the Service, subject to confidentiality obligations.\n• Legal Requirements: If required by law, court order, or governmental authority.`,
        },
        {
            title: '4. Data Retention',
            content: `We retain your account data for as long as your account is active. Messages and media you send are retained to provide the Service. You may request deletion of your account and associated data by contacting us at aryanrajeshgadam.3012@gmail.com. Certain data may be retained as needed for legal, financial, or security purposes.`,
        },
        {
            title: '5. Security',
            content: `We take reasonable measures to protect your personal information from loss, theft, misuse, and unauthorized access. Passwords are hashed using bcrypt and are never stored in plain text. Face ID descriptors are encrypted. Payment information is processed by Razorpay using PCI-DSS compliant infrastructure. However, no method of transmission over the Internet is 100% secure.`,
        },
        {
            title: '6. Cookies',
            content: `We use cookies and similar tracking technologies to maintain your session and improve your experience. You can control cookie settings through your browser. Disabling cookies may affect the functionality of the Service.`,
        },
        {
            title: '7. Children\'s Privacy',
            content: `The Service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete it.`,
        },
        {
            title: '8. Your Rights',
            content: `You have the right to:\n\n• Access the personal information we hold about you\n• Correct inaccurate data\n• Request deletion of your data\n• Withdraw consent for data processing at any time\n\nTo exercise these rights, please contact us at aryanrajeshgadam.3012@gmail.com.`,
        },
        {
            title: '9. Third-Party Links',
            content: `The Service may contain links to third-party websites. We are not responsible for the privacy practices or content of such sites. We encourage you to review the privacy policies of those sites.`,
        },
        {
            title: '10. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the Service. Your continued use after the changes take effect constitutes your acceptance of the revised policy.`,
        },
        {
            title: '11. Contact Us',
            content: `If you have any questions or concerns about this Privacy Policy, please contact us:\n\nEmail: aryanrajeshgadam.3012@gmail.com\nPhone: +91 9704563437`,
        },
    ];

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

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <div className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Privacy Policy</h1>
                    <p className="text-white/40 text-sm">Last updated: March 21, 2026</p>
                </div>

                <div className="space-y-8">
                    {sections.map((section, i) => (
                        <div key={i} className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 sm:p-8">
                            <h2 className="text-lg font-semibold mb-3 text-indigo-300">{section.title}</h2>
                            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{section.content}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center space-x-6 text-sm text-white/30">
                    <button onClick={() => router.push('/terms')} className="hover:text-white transition-colors">Terms of Service</button>
                    <button onClick={() => router.push('/contact')} className="hover:text-white transition-colors">Contact Us</button>
                    <button onClick={() => router.push('/')} className="hover:text-white transition-colors">Home</button>
                </div>
            </div>
        </div>
    );
}
