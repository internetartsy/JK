import { motion } from 'framer-motion';
import { Check, X, Eye } from 'lucide-react';

interface ReviewTask {
    id: string;
    document_id: string;
    type: string;
    confidence: number;
    status: string;
    date: string;
}

const MOCK_TASKS: ReviewTask[] = [
    { id: '1', document_id: 'DOC-2023-001', type: 'Khasra Girdawari', confidence: 0.45, status: 'Pending', date: '2023-10-15' },
    { id: '2', document_id: 'DOC-2023-002', type: 'Jamabandi', confidence: 0.62, status: 'Pending', date: '2023-10-16' },
    { id: '3', document_id: 'DOC-2023-005', type: 'Mutation', confidence: 0.38, status: 'Flagged', date: '2023-10-18' },
];

export function ReviewQueue() {
    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">Review Queue</h1>
                    <p className="text-secondary-500">Manual verification for low-confidence OCR results.</p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-600">
                    {MOCK_TASKS.length} Pending Tasks
                </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-secondary-50/50 border-b border-secondary-200">
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Document ID</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Type</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Confidence</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Date</th>
                            <th className="p-4 font-semibold text-secondary-600 text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_TASKS.map((task, i) => (
                            <motion.tr
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="border-b border-secondary-100 hover:bg-white/50 transition-colors"
                            >
                                <td className="p-4 font-mono text-sm text-secondary-900">{task.document_id}</td>
                                <td className="p-4 text-sm text-secondary-700">{task.type}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.confidence > 0.6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {(task.confidence * 100).toFixed(0)}%
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-secondary-500">{task.date}</td>
                                <td className="p-4 flex gap-2">
                                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                                        <Eye size={18} />
                                    </button>
                                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                        <Check size={18} />
                                    </button>
                                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                        <X size={18} />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {MOCK_TASKS.length === 0 && (
                    <div className="p-12 text-center text-secondary-400">
                        No pending reviews.
                    </div>
                )}
            </div>
        </div>
    );
}
