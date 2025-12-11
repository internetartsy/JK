import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hero3D } from './Hero3D';
import { useAuth } from 'react-oidc-context';
import { User, Lock, FileCheck, ShieldCheck, Tractor, RefreshCw } from 'lucide-react';

import { EnrollmentStatus } from './EnrollmentStatus';
import { ForgotPassword } from './ForgotPassword';

export function LandingPage() {
    const auth = useAuth();
    const [userType, setUserType] = useState<'farmer' | 'official'>('official');
    const [viewMode, setViewMode] = useState<'login' | 'status' | 'forgot'>('login');
    const [captcha, setCaptcha] = useState('');

    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptcha(result);
    };

    useEffect(() => {
        generateCaptcha();
    }, []);

    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        if (userId === 'admin' && password === 'admin') {
            // Dev Bypass
            window.location.href = '/?debug=true';
        } else {
            // Standard Auth
            auth.signinRedirect();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans text-white selection:bg-primary-500/30">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            {/* 3D Elements Placeholder (Can remain or be adjusted) */}
            <div className="absolute inset-0 pointer-events-none opacity-50">
                <Hero3D />
            </div>

            {/* Navbar */}
            <nav className="relative z-20 container mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="AgriStack" className="h-12 w-auto object-contain brightness-0 invert" />
                    <div className="h-8 w-px bg-white/20"></div>
                    <div className="bg-white rounded py-1 px-2 flex items-center justify-center">
                        <img
                            src="/nic_logo.png"
                            alt="NIC"
                            className="h-8 w-auto object-contain"
                        />
                    </div>
                </div>
                <div className="hidden md:flex items-center space-x-6">
                    <button onClick={() => window.location.href = '/?debug=true'} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Dashboard</button>
                    <button onClick={() => setViewMode('status')} className="text-sm font-medium text-primary-400 hover:text-white transition-colors">Check Enrollment Status</button>
                    <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Check Jansamarth KCC Status</a>
                </div>
            </nav>

            {/* Main Content Split */}
            <div className="relative z-10 container mx-auto px-6 pt-10 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-100px)]">

                {/* Left Side: Info */}
                <div className="max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-sm font-medium text-emerald-400">Live System</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8"
                    >
                        <span className="text-white">Digital Land</span>
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">
                            Governance Reimagined
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400 mb-10 max-w-lg leading-relaxed"
                    >
                        Next-generation land record management system for Jammu & Kashmir.
                        Integrating satellite intelligence, AI-OCR, and blockchain transparency.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex gap-8 text-gray-400"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400"><ShieldCheck size={24} /></div>
                            <div>
                                <div className="text-white font-bold text-xl">1.2M+</div>
                                <div className="text-xs uppercase tracking-wide">Parcels</div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><FileCheck size={24} /></div>
                            <div>
                                <div className="text-white font-bold text-xl">99.9%</div>
                                <div className="text-xs uppercase tracking-wide">Uptime</div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Login Form */}
                {/* Right Side: Login/Status Switch */}
                <div className="w-full mx-auto">
                    {viewMode === 'login' ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key="login-form"
                            className="w-full max-w-md mx-auto"
                        >
                            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="relative">
                                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Secure Login</h2>

                                    {/* User Type Toggle */}
                                    <div className="flex p-1 bg-slate-800/80 rounded-xl mb-8">
                                        <button
                                            onClick={() => setUserType('official')}
                                            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${userType === 'official'
                                                ? 'bg-primary-600 text-white shadow-lg'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <ShieldCheck size={16} />
                                            <span>Official</span>
                                        </button>
                                        <button
                                            onClick={() => setUserType('farmer')}
                                            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${userType === 'farmer'
                                                ? 'bg-green-600 text-white shadow-lg'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Tractor size={16} />
                                            <span>Farmer</span>
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">User ID / Mobile / Email</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary-400">
                                                    <User size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={userId}
                                                    onChange={(e) => setUserId(e.target.value)}
                                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                                    placeholder="Enter User ID, Mobile or Email"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary-400">
                                                    <Lock size={18} />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Security Code</label>
                                            <div className="flex space-x-3">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                                        placeholder="Enter captcha"
                                                    />
                                                </div>
                                                <div
                                                    onClick={generateCaptcha}
                                                    className="w-32 bg-white/10 hover:bg-white/20 transition-colors rounded-lg flex items-center justify-center select-none cursor-pointer group/captcha relative overflow-hidden"
                                                    title="Click to Refresh Captcha"
                                                >
                                                    <span className="text-xl font-mono font-bold tracking-widest text-primary-300 line-through decoration-white/30 relative z-10">{captcha}</span>
                                                    <div className="absolute right-1 top-1 text-white/20 group-hover/captcha:text-white/50 transition-colors">
                                                        <RefreshCw size={12} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleLogin}
                                            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-black/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${userType === 'official'
                                                ? 'bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 shadow-primary-900/40'
                                                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/40'
                                                }`}
                                        >
                                            Access Account
                                        </button>

                                        <div className="flex items-center justify-between text-sm">
                                            <button onClick={() => setViewMode('forgot')} className="text-gray-400 hover:text-white transition-colors">Forgot Password?</button>
                                            <button
                                                onClick={() => auth.signinRedirect()}
                                                className="text-primary-400 hover:text-primary-300 font-medium"
                                            >
                                                Login via CSC
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-center text-gray-500 text-sm mt-6">
                                By logging in, you agree to our <a href="#" className="text-gray-400 hover:text-white underline">Terms of Service</a> and <a href="#" className="text-gray-400 hover:text-white underline">Privacy Policy</a>.
                            </p>
                        </motion.div>
                    ) : viewMode === 'forgot' ? (
                        <ForgotPassword onBack={() => setViewMode('login')} />
                    ) : (
                        <EnrollmentStatus onBack={() => setViewMode('login')} />
                    )}
                </div>
            </div>
        </div>
    );
}
