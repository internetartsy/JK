import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ReviewTask } from './reviewService';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';
import { clsx } from 'clsx';

interface ReviewEditorProps {
    task: ReviewTask;
    onApprove: (data: Record<string, any>) => void;
    onReject: () => void;
    onCancel: () => void;
}

export const ReviewEditor: React.FC<ReviewEditorProps> = ({ task, onApprove, onReject, onCancel }) => {
    const { register, handleSubmit, formState: { dirtyFields } } = useForm({
        defaultValues: task.extracted_fields
    });

    // Image Zoom State
    const [zoom, setZoom] = useState(1);

    // Construct Image URL (assuming standard path)
    const imageUrl = `/api/v1/storage/scans/${task.document_id}.jpg`;

    const onSubmit = (data: Record<string, any>) => {
        onApprove(data);
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-slate-50 overflow-hidden border rounded-lg shadow-xl">
            {/* Left Panel: Document Image */}
            <div className="w-1/2 bg-gray-900 relative overflow-auto flex items-center justify-center p-4">
                <div className="absolute top-4 right-4 flex space-x-2 z-10 bg-black/50 p-1 rounded-md">
                    <button
                        onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                        className="p-1 text-white hover:bg-white/20 rounded"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <span className="text-white text-sm px-2 py-1">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                        className="p-1 text-white hover:bg-white/20 rounded"
                    >
                        <ZoomIn size={20} />
                    </button>
                </div>

                <div
                    style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
                    className="origin-center"
                >
                    <img
                        src={imageUrl}
                        alt="Document Scan"
                        className="max-w-full shadow-lg"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x800?text=Document+Not+Found';
                        }}
                    />
                </div>
            </div>

            {/* Right Panel: Extraction Form */}
            <div className="w-1/2 flex flex-col bg-white border-l border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Review Task #{task.id.slice(0, 8)}</h2>
                        <span className="text-sm text-gray-500 uppercase tracking-wide font-semibold">{task.document_type}</span>
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                        {Math.round(task.confidence_score * 100)}% Confidence
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="review-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {Object.keys(task.extracted_fields).map((field) => (
                            <div key={field} className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                    {field.replace(/_/g, ' ')}
                                </label>
                                <input
                                    type="text"
                                    {...register(field)}
                                    className={clsx(
                                        "block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border",
                                        dirtyFields[field] ? "bg-yellow-50 border-yellow-400" : "bg-white"
                                    )}
                                />
                                {dirtyFields[field] && (
                                    <span className="absolute right-2 top-8 text-xs text-amber-600 font-medium animate-pulse">
                                        Edited
                                    </span>
                                )}
                            </div>
                        ))}
                    </form>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <div className="flex space-x-3">
                        <button
                            onClick={onReject}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <X className="-ml-1 mr-2 h-5 w-5" />
                            Reject
                        </button>
                        <button
                            form="review-form"
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <Check className="-ml-1 mr-2 h-5 w-5" />
                            Approve & Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
