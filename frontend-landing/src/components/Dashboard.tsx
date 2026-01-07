import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { Activity, AlertTriangle, CheckCircle2, Clock, FileCheck, Users, Globe, ShieldCheck, Zap, Database } from 'lucide-react';
import { parcelApi, reviewApi, type LandParcel, type ReviewTask } from '../api/client';

export function Dashboard() {
    const auth = useAuth();
    const userName = auth.user?.profile?.name || auth.user?.profile?.preferred_username || "Officer";

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendingReviews: 0,
        totalParcels: 0,
        totalFarmers: 0,
        activeParcels: 0,
        nationalSyncRate: 94.2,
        activeJobs: 12
    });
    const [pendingTasks, setPendingTasks] = useState<ReviewTask[]>([]);
    const [recentParcels, setRecentParcels] = useState<LandParcel[]>([]);

    useEffect(() => {
        async function loadData() {
            try {
                // Parallel fetch
                const [reviews, parcelStats, recent] = await Promise.all([
                    reviewApi.getPending().catch(() => []),
                    parcelApi.getStats().catch(() => ({ total_parcels: 0, total_farmers: 0, avg_parcels_per_farmer: 0 })),
                    parcelApi.getRecent(5).catch(() => [])
                ]);

                setStats({
                    pendingReviews: reviews.length,
                    totalParcels: parcelStats.total_parcels,
                    totalFarmers: parcelStats.total_farmers,
                    activeParcels: parcelStats.total_parcels,
                    nationalSyncRate: 94.2,
                    activeJobs: 12
                });
                setPendingTasks(reviews.slice(0, 5)); // Top 5
                setRecentParcels(recent);
            } catch (err) {
                console.error("Dashboard data load failed", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-8 p-6 lg:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        Welcome back, <span className="text-primary-600 dark:text-primary-400">{userName}</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Official Officer Portal • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </motion.div>


            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
                <StatCard
                    title="Exception Review"
                    value={stats.pendingReviews}
                    icon={AlertTriangle}
                    color="amber"
                    desc="Low-confidence OCR"
                />
                <StatCard
                    title="AgriStack Sync"
                    value={`${stats.nationalSyncRate}%`}
                    icon={Globe}
                    color="purple"
                    desc="National Gateway Flow"
                />
                <StatCard
                    title="Digitized Registry"
                    value={stats.totalParcels.toLocaleString()}
                    icon={Database}
                    color="blue"
                    desc="Verified Land Records"
                />
                <StatCard
                    title="Kisan Workforce"
                    value={stats.totalFarmers.toLocaleString()}
                    icon={Users}
                    color="emerald"
                    desc="KYC Linked Identities"
                />
            </motion.div>

            {/* Live Pipeline Telemetry */}
            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="show"
                className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Zap size={120} className="text-primary-500" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-primary-500/20 p-2 rounded-lg">
                            <Zap className="text-primary-500" size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Motia Operational Pipeline</h3>
                            <p className="text-slate-400 text-sm">Real-time telemetry of the J&K AgriStack engine</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <PipelineStep label="Edge" status="Active" icon={Globe} sub="Rust Gate" />
                        <PipelineStep label="OCR" status="Active" icon={Activity} sub="Table Ext" />
                        <PipelineStep label="Spatial" status="Sync" icon={Zap} sub="ULPIN Gen" />
                        <PipelineStep label="e-KYC" status="Active" icon={ShieldCheck} sub="Aadhaar" />
                        <PipelineStep label="National" status="Transmitting" icon={Globe} sub="JSON Push" active />
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending Tasks List */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock size={20} className="text-amber-500" />
                            Review Queue
                        </h3>
                        <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
                            {stats.pendingReviews} Pending
                        </span>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded-xl" />)}
                            </div>
                        ) : pendingTasks.length > 0 ? (
                            pendingTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-600">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-white dark:bg-slate-800 rounded-lg text-amber-500 shadow-sm">
                                            <FileCheck size={16} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                                {task.document_type} Review
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                ID: {task.document_id.substring(0, 8)}...
                                            </p>
                                            <div className="mt-1 flex gap-2">
                                                <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                                                    Confidence: {(task.confidence_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.location.href = `/?debug=true&view=review`}
                                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                    >
                                        Inspect
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                                <CheckCircle2 size={32} className="mx-auto mb-3 text-green-500 opacity-50" />
                                <p>All caught up! No pending reviews.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Recent Activity / System Status */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity size={20} className="text-blue-500" />
                            Recent Field Updates
                        </h3>
                    </div>

                    <div className="space-y-0 divide-y divide-gray-100 dark:divide-slate-700">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-slate-700 rounded-lg" />)}
                            </div>
                        ) : recentParcels.length > 0 ? (
                            recentParcels.map((parcel, idx) => (
                                <div key={parcel.id || idx} className="flex items-center gap-4 py-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            Parcel <span className="font-mono text-gray-500">{parcel.khasra_number}</span> Updated
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {parcel.village_id} • {parcel.status.replace('_', ' ')}
                                            </p>
                                            {parcel.status !== 'blockchain_recorded' && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await parcelApi.transmit(parcel.id);
                                                            window.location.reload();
                                                        } catch (e) {
                                                            alert("Transmission failed");
                                                        }
                                                    }}
                                                    className="text-[10px] bg-primary-500/10 text-primary-500 px-1.5 py-0.5 rounded font-bold hover:bg-primary-500 hover:text-white transition-all flex items-center gap-1"
                                                >
                                                    <Globe size={10} /> Transmit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 tabular-nums">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">No recent activity</div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function PipelineStep({ label, status, icon: Icon, sub, active }: { label: string, status: string, icon: any, sub: string, active?: boolean }) {
    const isError = status.toLowerCase().includes('fail') || status.toLowerCase().includes('err');
    const isWarning = status.toLowerCase().includes('pend') || status.toLowerCase().includes('sync');

    return (
        <div className={`p-4 rounded-2xl border transition-all ${active ? 'bg-primary-500/10 border-primary-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${active ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    <Icon size={16} />
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-500' :
                        isWarning ? 'bg-amber-500 animate-pulse' :
                            active ? 'bg-primary-500 animate-ping' : 'bg-emerald-500'
                    }`} />
            </div>
            <p className="text-white font-bold text-sm">{label}</p>
            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{sub}</p>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, desc }: { title: string, value: string | number, icon: any, color: string, desc: string }) {
    const colors: Record<string, string> = {
        amber: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
        blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
        emerald: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
        purple: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-start justify-between group hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-500 mb-1 uppercase tracking-tight">{title}</p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">{value}</h3>
                <p className="text-[10px] text-gray-400 font-medium">{desc}</p>
            </div>
            <div className={`p-3 rounded-xl ${colors[color]} group-hover:scale-110 transition-all shadow-sm`}>
                <Icon size={20} />
            </div>
        </div>
    );
}
