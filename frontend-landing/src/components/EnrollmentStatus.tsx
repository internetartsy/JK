import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, CheckCircle2, AlertCircle } from 'lucide-react';

interface EnrollmentStatusProps {
    onBack: () => void;
}

type IdType = 'enrollment_id' | 'farmer_id' | 'aadhaar_number';

export function EnrollmentStatus({ onBack }: EnrollmentStatusProps) {
    const [idType, setIdType] = useState<IdType>('enrollment_id');
    const [idValue, setIdValue] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'not_found'>('idle');

    const handleCheck = () => {
        if (!idValue) return;

        setStatus('loading');
        // Simulate API call
        setTimeout(() => {
            // Mock logic: if ID starts with 'TR', success, else not found
            if (idValue.startsWith('TR') || idValue.length > 5) {
                setStatus('success');
            } else {
                setStatus('not_found');
            }
        }, 1500);
    };

    const getIdLabel = () => {
        switch (idType) {
            case 'enrollment_id': return 'Enrollment ID';
            case 'farmer_id': return 'Farmer ID';
            case 'aadhaar_number': return 'Aadhaar Number';
        }
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

                    <h2 className="text-2xl font-bold text-white mb-2">Check Enrollment Status</h2>
                    <p className="text-gray-400 mb-8 text-sm">Verify the current status of your land record digitization.</p>

                    <div className="space-y-6">
                        {/* ID Type Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Check Status Against</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setIdType('enrollment_id')}
                                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${idType === 'enrollment_id'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                                >
                                    Enrollment ID
                                </button>
                                <button
                                    onClick={() => setIdType('farmer_id')}
                                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${idType === 'farmer_id'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                                >
                                    Farmer ID
                                </button>
                                <button
                                    onClick={() => setIdType('aadhaar_number')}
                                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${idType === 'aadhaar_number'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                                >
                                    Aadhaar
                                </button>
                            </div>
                        </div>

                        {/* Input Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Enter {getIdLabel()}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={idValue}
                                    onChange={(e) => setIdValue(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    placeholder={`e.g. ${idType === 'aadhaar_number' ? 'XXXX-XXXX-XXXX' : 'TR-2024-XXXX'}`}
                                />
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleCheck}
                            disabled={status === 'loading' || !idValue}
                            className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                        >
                            {status === 'loading' ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    <Search size={18} />
                                    Check Status
                                </>
                            )}
                        </button>

                        {/* Result Display */}
                        {status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                                    <CheckCircle2 className="text-emerald-400 flex-shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="text-emerald-400 font-semibold text-sm">Farmer ID Issued: JK-F-2025-9921</h4>
                                        <p className="text-emerald-200/60 text-xs mt-1">Verification complete. Data transmitted to National AgriStack Funnel.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-800/80 border border-white/10 rounded-xl p-4">
                                    <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 opacity-60">Verified Registry Pipeline</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>Spatial ULPIN Mapping Complete</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>Biometric Aadhaar e-KYC Linked</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                            <span className="text-blue-300">Pushing JSON Bucket to National Gateway...</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {status === 'not_found' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
                            >
                                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="text-red-400 font-semibold text-sm">Record Not Found</h4>
                                    <p className="text-red-200/60 text-xs mt-1">We couldn't find any record matching the provided ID. Please check the number and try again.</p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
