import { motion } from 'framer-motion';
import { Check, X, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { reviewApi, type ReviewTask } from '../api/client';

export function ReviewQueue() {
    const [tasks, setTasks] = useState<ReviewTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const data = await reviewApi.getPending();
            setTasks(data);
        } catch (error) {
            console.error('Failed to load review tasks', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await reviewApi.approve(id);
            loadTasks(); // Refresh
        } catch (error) {
            console.error('Approval failed', error);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await reviewApi.reject(id);
            loadTasks(); // Refresh
        } catch (error) {
            console.error('Rejection failed', error);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">Review Queue</h1>
                    <p className="text-secondary-500">Manual verification for low-confidence OCR results.</p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-600">
                    {tasks.length} Pending Tasks
                </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-secondary-50/50 border-b border-secondary-200">
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Document ID</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Type</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Confidence</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Status</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-secondary-400">Loading reviews...</td>
                            </tr>
                        )}
                        {!loading && tasks.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-secondary-400">No pending reviews.</td>
                            </tr>
                        )}
                        {!loading && tasks.map((task, i) => (
                            <motion.tr
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="border-b border-secondary-100 hover:bg-white/50 transition-colors"
                            >
                                <td className="p-4 font-mono text-sm text-secondary-900">{task.document_id}</td>
                                <td className="p-4 text-sm text-secondary-700">{task.document_type}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.confidence_score > 0.6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {(task.confidence_score * 100).toFixed(0)}%
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-secondary-500">{task.status}</td>
                                <td className="p-4 flex gap-2">
                                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Approve"
                                        onClick={() => handleApprove(task.id)}
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Reject"
                                        onClick={() => handleReject(task.id)}
                                    >
                                        <X size={18} />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
