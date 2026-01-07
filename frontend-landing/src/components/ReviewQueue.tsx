import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Eye, ShieldCheck, Fingerprint, Activity, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { reviewApi, type ReviewTask } from '../api/client';

export function ReviewQueue() {
    const [tasks, setTasks] = useState<ReviewTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchTasks = async () => {
        try {
            const data = await reviewApi.getPending();
            setTasks(data);
        } catch (err) {
            console.error("Failed to fetch review tasks", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleApprove = async (id: string) => {
        setActioningId(id);
        try {
            await reviewApi.approve(id);
            setTasks(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            alert("Approval failed. Please try again.");
        } finally {
            setActioningId(null);
        }
    };

    const handleReject = async (id: string) => {
        setActioningId(id);
        try {
            await reviewApi.reject(id);
            setTasks(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            alert("Rejection failed.");
        } finally {
            setActioningId(null);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-secondary-900 flex items-center gap-3">
                        Manual Verification
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-lg border border-amber-200 uppercase font-black">Exceptions Flagged</span>
                    </h1>
                    <p className="text-secondary-500 mt-1 font-medium font-sans">AgriStack Governance: Reviewing low-confidence OCR and identity mismatches.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { setLoading(true); fetchTasks(); }}
                        className="bg-white border border-secondary-200 p-2.5 rounded-xl hover:bg-secondary-50 transition-all text-secondary-600 shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2">
                        <Activity className="text-emerald-600" size={16} />
                        <span className="text-sm font-bold text-emerald-700 tabular-nums">98.2% Auto-Sync</span>
                    </div>
                </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl overflow-hidden border-b-0 ring-1 ring-black/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-secondary-50/50 border-b border-secondary-200">
                            <th className="p-5 font-bold text-secondary-500 text-[10px] uppercase tracking-[0.2em]">Document Identifier</th>
                            <th className="p-5 font-bold text-secondary-500 text-[10px] uppercase tracking-[0.2em]">Type</th>
                            <th className="p-5 font-bold text-secondary-500 text-[10px] uppercase tracking-[0.2em]">OCR Score</th>
                            <th className="p-5 font-bold text-secondary-500 text-[10px] uppercase tracking-[0.2em]">Trust Layer</th>
                            <th className="p-5 font-bold text-secondary-500 text-[10px] uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        <AnimatePresence mode="popLayout">
                            {tasks.map((task) => (
                                <motion.tr
                                    layout
                                    key={task.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="hover:bg-white/80 transition-all group"
                                >
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-sm text-secondary-900 font-bold tracking-tight">#{task.document_id.substring(0, 8)}</span>
                                            <span className="text-[10px] text-primary-500 font-black uppercase tracking-widest mt-0.5">Motia-Doc1D</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-secondary-100 p-1.5 rounded-lg text-secondary-600">
                                                <Activity size={12} />
                                            </div>
                                            <span className="text-sm font-bold text-secondary-800">{task.document_type}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 w-20 bg-secondary-100 rounded-full overflow-hidden border border-black/5">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${task.confidence_score > 0.6 ? 'bg-amber-400' : 'bg-red-500'}`}
                                                    style={{ width: `${task.confidence_score * 100}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-black tabular-nums ${task.confidence_score > 0.6 ? 'text-amber-600' : 'text-red-700'}`}>
                                                {(task.confidence_score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${task.confidence_score > 0.8 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                <ShieldCheck size={12} />
                                                Identity Linked
                                            </div>
                                            <div className="text-secondary-400 hover:text-primary-600 transition-colors cursor-help">
                                                <Fingerprint size={16} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex gap-2">
                                            <button
                                                className="p-2.5 text-secondary-400 hover:bg-secondary-100 hover:text-primary-600 rounded-xl transition-all border border-transparent hover:border-secondary-200"
                                                title="Inspect & Rectify"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(task.id)}
                                                disabled={!!actioningId}
                                                className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100 disabled:opacity-30 disabled:grayscale"
                                                title="Approve & Push to AgriStack"
                                            >
                                                <Check size={18} className={actioningId === task.id ? 'animate-bounce' : ''} />
                                            </button>
                                            <button
                                                onClick={() => handleReject(task.id)}
                                                disabled={!!actioningId}
                                                className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 disabled:opacity-30 disabled:grayscale"
                                                title="Reject - Request Rescan"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>

                {tasks.length === 0 && !loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-20 text-center"
                    >
                        <div className="bg-emerald-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
                            <ShieldCheck className="text-emerald-500" size={40} />
                        </div>
                        <h3 className="text-secondary-900 font-black text-xl tracking-tight">Queue Decimated</h3>
                        <p className="text-secondary-500 font-medium max-w-xs mx-auto mt-2">All AgriStack exceptions have been processed. System is in absolute parity.</p>
                    </motion.div>
                )}

                {loading && (
                    <div className="p-20 text-center animate-pulse">
                        <div className="flex justify-center mb-4">
                            <div className="h-2 w-48 bg-secondary-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-500 w-1/2 animate-shimmer" />
                            </div>
                        </div>
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Polling Secure Backend...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
