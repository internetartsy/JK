import React, { useEffect, useState } from 'react';
import { reviewService } from './reviewService';
import type { ReviewTask } from './reviewService';
import { ReviewEditor } from './ReviewEditor';
import { Loader2, AlertCircle, FileText } from 'lucide-react';

export const ReviewDashboard: React.FC = () => {
    const [tasks, setTasks] = useState<ReviewTask[]>([]);
    const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const data = await reviewService.getPendingReviews();
            setTasks(data);
            setError(null);
        } catch (err: any) {
            console.error(err);
            // Fallback mock data for demo if backend is offline/empty
            setTasks([
                {
                    id: 'task-1234',
                    document_id: 'doc-abc-123',
                    document_type: 'girdawari',
                    confidence_score: 0.65,
                    status: 'pending',
                    extracted_fields: {
                        khasra_number: '143/2',
                        village_name: 'Unknown Village',
                        owner_name: 'Ali Ahmed',
                        area: '5.2 Kanal'
                    },
                    created_at: new Date().toISOString()
                }
            ]);
            setError('Failed to fetch tasks. Showing demo data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
    }, []);

    const handleApprove = async (correctedData: Record<string, any>) => {
        if (!selectedTask) return;
        try {
            await reviewService.approveReview(selectedTask.id, correctedData);
            // Remove from list
            setTasks(tasks.filter(t => t.id !== selectedTask.id));
            setSelectedTask(null);
        } catch (e) {
            alert('Failed to approve review');
        }
    };

    const handleReject = async () => {
        if (!selectedTask) return;
        try {
            await reviewService.rejectReview(selectedTask.id);
            setTasks(tasks.filter(t => t.id !== selectedTask.id));
            setSelectedTask(null);
        } catch (e) {
            alert('Failed to reject review');
        }
    };

    if (selectedTask) {
        return (
            <ReviewEditor
                task={selectedTask}
                onApprove={handleApprove}
                onReject={handleReject}
                onCancel={() => setSelectedTask(null)}
            />
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Review Dashboard</h1>
                    <p className="mt-2 text-gray-600">
                        {tasks.length} pending tasks require manual verification
                    </p>
                </div>
                <button
                    onClick={loadTasks}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 font-medium"
                >
                    Refresh List
                </button>
            </div>

            {error && (
                <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {tasks.length === 0 ? (
                            <li className="p-12 text-center text-gray-500">
                                No pending reviews found. Good job!
                            </li>
                        ) : (
                            tasks.map((task) => (
                                <li key={task.id}>
                                    <button
                                        onClick={() => setSelectedTask(task)}
                                        className="w-full block hover:bg-gray-50 text-left focus:outline-none focus:bg-gray-50 transition duration-150 ease-in-out"
                                    >
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium text-indigo-600 truncate flex items-center">
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    {task.document_type.toUpperCase()}
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.confidence_score > 0.7 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {Math.round(task.confidence_score * 100)}% Match
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        Doc ID: {task.document_id}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p>
                                                        Created {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'Just now'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
