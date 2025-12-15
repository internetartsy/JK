import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Database, CheckCircle, User, Layers } from 'lucide-react';
import { dataCleaningApi } from '../api/client';

export function DataCleaning() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleRunPipeline = async () => {
        setLoading(true);
        setErrorMsg(null);
        setResults(null); // Clear previous results to show activity
        try {
            const data = await dataCleaningApi.runPipeline("Test Village");
            console.log("Pipeline result:", data);
            setResults(data);
        } catch (error: any) {
            console.error("Pipeline failed", error);
            setErrorMsg(error.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 p-6 lg:p-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Cleaning & Consolidation</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Sanitize ROR records and link with PM-Kisan, PMFBY, and SASDB schemas.
                    </p>
                </div>
                <button
                    onClick={handleRunPipeline}
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <Play size={20} />
                    )}
                    Run Pipeline
                </button>
            </div>

            {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
                    Error: {errorMsg}
                </div>
            )}

            {/* Results Area */}
            {results ? (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard label="Total Records Processed" value={results.count} icon={Database} color="blue" />
                        <StatCard label="Clusters Identified" value={results.clusters_found} icon={Layers} color="purple" />
                        <StatCard label="Consolidated Matches" value={(results.data || []).filter((r: any) => r.status === 'Linked').length} icon={CheckCircle} color="emerald" />
                    </div>

                    {/* Detailed List */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Detailed Matches</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {results.data?.map((item: any, idx: number) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-xl ${item.status === 'Linked' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'} dark:bg-slate-700`}>
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                                    {item.id}
                                                    {item.status === 'Linked' && (
                                                        <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                                            Verified Match
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-sm text-gray-500 mt-1">Primary Ref: {item.primary_ref}</p>

                                                {item.members && (
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {item.members.map((m: string) => (
                                                            <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-800">
                                                                <Database size={12} />
                                                                {m}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Confidence</span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">{item.confidence || 'N/A'}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-gray-400">
                    <Database size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">No pipeline data yet</p>
                    <p className="text-sm">Click "Run Pipeline" to start the analysis.</p>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${colors[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
}
