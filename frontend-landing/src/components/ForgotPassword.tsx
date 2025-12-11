import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';

interface ForgotPasswordProps {
    onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
    const [userRole, setUserRole] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleReset = () => {
        if (!userRole || !mobileNumber) return;

        setStatus('loading');
        // Simulate API call
        setTimeout(() => {
            setStatus('success');
        }, 1500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg mx-auto"
        >
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />

                <div className="relative z-10">
                    <button
                        onClick={onBack}
                        className="flex items-center text-gray-400 hover:text-white transition-colors mb-6 group"
                    >
                        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-2">Forgot Password</h2>
                    <p className="text-gray-400 mb-8 text-sm">Reset your password by verifying your role and mobile number.</p>

                    <div className="space-y-6">
                        {/* User Role Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Please Select User Role</label>
                            <select
                                value={userRole}
                                onChange={(e) => setUserRole(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Select User Role</option>
                                <option value="farmer">Farmer</option>
                                <option value="official">Official (Patwari/Tehsildar)</option>
                                <option value="admin">Administrator</option>
                            </select>
                            {!userRole && status !== 'idle' && (
                                <p className="text-red-400 text-xs mt-1">User Role is required.</p>
                            )}
                        </div>

                        {/* Mobile Number Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Please Enter Your Registered Mobile Number</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    placeholder="Enter Mobile Number"
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleReset}
                            disabled={status === 'loading' || !userRole || !mobileNumber}
                            className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                        >
                            {status === 'loading' ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Send OTP
                                </>
                            )}
                        </button>

                        {/* Success Message */}
                        {status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"
                            >
                                <h4 className="text-emerald-400 font-semibold text-sm">OTP Sent Successfully</h4>
                                <p className="text-emerald-200/60 text-xs mt-1">Please check your registered mobile number for the password reset instructions.</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
