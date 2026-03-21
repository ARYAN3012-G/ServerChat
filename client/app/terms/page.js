'use client';

import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiMessageSquare } from 'react-icons/fi';

export default function TermsOfService() {
    const router = useRouter();

    const sections = [
        {
            title: '1. Acceptance of Terms',
            content: `By accessing or using ServerChat ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all visitors, users, and others who access or use the Service.`,
        },
        {
            title: '2. Description of Service',
            content: `ServerChat is a real-time communication platform that allows users to send messages, share media, join servers, make voice/video calls, and access premium features through a paid subscription ("ServerChat Pro"). The Service is provided by Aryan Rajesh Gadam ("we", "us", or "our").`,
        },
        {
            title: '3. User Accounts',
            content: `You must create an account to use most features of ServerChat. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 13 years of age to create an account. You agree to provide accurate and complete information when creating your account.`,
        },
        {
            title: '4. Acceptable Use',
            content: `You agree not to use the Service to: (a) upload, transmit, or distribute any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, or obscene; (b) impersonate any person or entity; (c) engage in any form of spam, phishing, or unauthorized advertising; (d) attempt to gain unauthorized access to any portion of the Service; (e) interfere with or disrupt the integrity or performance of the Service.`,
        },
        {
            title: '5. ServerChat Pro Subscription',
            content: `ServerChat Pro is a monthly paid subscription service priced at ₹50 (Indian Rupees) per month. Payments are processed securely through Razorpay. By subscribing, you authorize us to charge your selected payment method on a recurring monthly basis. You may cancel your subscription at any time from the Settings > Subscription page. Your Pro benefits will remain active until the end of the current billing cycle. All payments are non-refundable unless required by applicable law.`,
        },
        {
            title: '6. Content Ownership',
            content: `You retain ownership of all content you create and share on ServerChat. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display your content solely to operate and improve the Service. We do not claim ownership of your content and will not sell your personal content to third parties.`,
        },
        {
            title: '7. Termination',
            content: `We reserve the right to suspend or terminate your account at any time if you violate these Terms of Service or engage in conduct that harms the Service or other users. You may also delete your account at any time by contacting us at aryanrajeshgadam.3012@gmail.com.`,
        },
        {
            title: '8. Disclaimer of Warranties',
            content: `The Service is provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or completely secure.`,
        },
        {
            title: '9. Limitation of Liability',
            content: `To the fullest extent permitted by applicable law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the Service.`,
        },
        {
            title: '10. Changes to Terms',
            content: `We reserve the right to modify these Terms of Service at any time. We will notify users of significant changes by posting a notice on the Service. Your continued use of the Service after the changes take effect constitutes your acceptance of the revised terms.`,
        },
        {
            title: '11. Governing Law',
            content: `These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in India.`,
        },
        {
            title: '12. Contact Us',
            content: `If you have any questions about these Terms of Service, please contact us at:\n\nEmail: aryanrajeshgadam.3012@gmail.com\nPhone: +91 9704563437`,
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
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Terms of Service</h1>
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
                    <button onClick={() => router.push('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
                    <button onClick={() => router.push('/contact')} className="hover:text-white transition-colors">Contact Us</button>
                    <button onClick={() => router.push('/')} className="hover:text-white transition-colors">Home</button>
                </div>
            </div>
        </div>
    );
}
