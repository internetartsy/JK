import { motion } from 'framer-motion';
import { Hero3D } from './Hero3D';
import { useAuth } from 'react-oidc-context';

export function LandingPage() {
    const auth = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans text-white">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-400/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

            <Hero3D />

            {/* Navbar */}
            <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        AgriStack
                    </span>
                </div>
                <div className="hidden md:flex items-center space-x-8">
                    <a href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Features</a>
                    <a href="#impact" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Impact</a>
                    <button
                        onClick={() => auth.signinRedirect()}
                        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-semibold transition-all backdrop-blur-sm"
                    >
                        Official Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative z-10 container mx-auto px-6 pt-20 pb-32">
                <div className="max-w-4xl">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-8"
                    >
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">
                            Digital Land
                        </span>
                        <br />
                        Governance Reimagined
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed"
                    >
                        Next-generation land record management system for Jammu & Kashmir.
                        Integrating satellite intelligence, AI-ocr, and blockchain for transparent governance.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap gap-4"
                    >
                        <button
                            onClick={() => auth.signinRedirect()}
                            className="px-8 py-4 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 rounded-xl font-bold text-lg shadow-lg shadow-primary-900/50 transition-all hover:scale-105"
                        >
                            Access Portal
                        </button>
                        <button className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg transition-all backdrop-blur-sm">
                            View Public Records
                        </button>
                    </motion.div>
                </div>
            </header>

            {/* Stats Section */}
            <div className="relative z-10 border-t border-white/10 bg-slate-900/50 backdrop-blur-lg">
                <div className="container mx-auto px-6 py-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: 'Land Parcels', value: '1.2M+' },
                            { label: 'Districts', value: '20' },
                            { label: 'Digitization', value: '98%' },
                            { label: 'Uptime', value: '99.9%' },
                        ].map((stat, i) => (
                            <div key={i}>
                                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-sm text-gray-400 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
