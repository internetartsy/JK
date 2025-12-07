import { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { cn } from '../lib/utils';

interface ReviewTask {
  id: string;
  document_id: string;
  document_type: string;
  confidence_score: number;
  extracted_fields: Record<string, any>;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface ReviewQueueProps {
  tasks: ReviewTask[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  onSelect: (task: ReviewTask) => void;
}

export default function ReviewQueue({ tasks, onApprove, onReject, onSelect }: ReviewQueueProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingTasks = tasks.filter(t => t.status === 'Pending');

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="flex h-full flex-col bg-secondary-50 border-r border-secondary-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-white">
        <h2 className="text-sm font-semibold text-secondary-900">Review Queue</h2>
        <span className="inline-flex items-center rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-800">
          {pendingTasks.length} pending
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-secondary-400">
            <CheckIcon className="h-12 w-12 mb-2 text-green-500" />
            <p className="text-sm">No pending reviews</p>
          </div>
        ) : (
          pendingTasks.map(task => (
            <div
              key={task.id}
              onClick={() => {
                setSelectedId(task.id);
                onSelect(task);
              }}
              className={cn(
                "group relative flex flex-col gap-2 rounded-lg border p-3 shadow-sm transition-all hover:shadow-md cursor-pointer",
                selectedId === task.id
                  ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                  : "border-secondary-200 bg-white hover:border-primary-300"
              )}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-secondary-900 text-sm">{task.document_type}</span>
                <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", getConfidenceColor(task.confidence_score))}>
                  {Math.round(task.confidence_score * 100)}%
                </span>
              </div>

              <div className="text-xs text-secondary-500">#{task.document_id}</div>

              <div className="space-y-1">
                {Object.entries(task.extracted_fields).slice(0, 2).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-secondary-500 truncate max-w-[80px]">{key}:</span>
                    <span className="font-medium text-secondary-900 truncate max-w-[120px]">{String(value)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2 pt-2 border-t border-secondary-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(task.id); }}
                  className="flex-1 flex items-center justify-center gap-1 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                >
                  <CheckIcon className="h-3 w-3" /> Approve
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReject(task.id); }}
                  className="flex-1 flex items-center justify-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  <XMarkIcon className="h-3 w-3" /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
