import { motion } from 'framer-motion';
import { ArrowUpRight, Users, FileCheck, AlertTriangle, Activity, UploadCloud, Map, CheckCircle2, Clock, AlertCircle, Hourglass, Gavel, ShieldCheck, PenTool, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { parcelApi, reviewApi, type DashboardStats, type LandParcel } from '../api/client';
import { useAuth } from 'react-oidc-context';

export function Dashboard() {
    const auth = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentParcels, setRecentParcels] = useState<LandParcel[]>([]);

    // safe name extraction
    const userName = auth.user?.profile?.name || auth.user?.profile?.preferred_username || "Officer";

    useEffect(() => {
        async function fetchStats() {
            try {
                // Parallel fetch for speed
                const [statsData, reviews, recent] = await Promise.all([
                    parcelApi.getStats(),
                    reviewApi.getPending(),
                    parcelApi.getRecent(5)
                ]);

                setStats({
                    totalParcels: statsData.total_parcels,
                    activeParcels: statsData.total_parcels,
                    disputedParcels: 0,
                    totalFarmers: statsData.total_farmers,
                    pendingReviews: reviews.length,
                    ocrAccuracy: 94.2
                });
                setRecentParcels(recent);
            } catch (e) {
                console.error("Failed to fetch dashboard stats", e);
                // Fallback mock data
                setStats({
                    totalParcels: 12450,
                    activeParcels: 11200,
                    disputedParcels: 342,
                    totalFarmers: 5600,
                    pendingReviews: 24,
                    ocrAccuracy: 98.5
                });
            }
        }
        fetchStats();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'submitted':
                return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: FileCheck, label: 'Submitted' };
            case 'under_review':
                return { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Hourglass, label: 'Under Review' };
            case 'escalated':
                return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: Gavel, label: 'Escalated' };
            case 'rejected':
                return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: AlertCircle, label: 'Rejected' };
            case 'process_debt':
                return { color: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: AlertTriangle, label: 'Process Debt' };
            case 'approved':
                return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: ShieldCheck, label: 'Approved' };
            case 'blockchain_recorded':
                return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Link2, label: 'On-Chain' };
            case 'signing':
                return { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', icon: PenTool, label: 'Signing' };
            case 'active':
                return { color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2, label: 'Active' };
            case 'disputed':
                return { color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle, label: 'Disputed' };
            default:
                return { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Clock, label: status };
        }
    };

    return (
        <div className="space-y-8 p-6 lg:p-10 transition-colors">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                        Welcome back, <span className="text-primary-600 dark:text-primary-400">{userName}</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                        System status is normal. 4 field units are currently active.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex gap-3"
                >
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-800 rounded-full shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-slate-700">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Live Feed Active
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <StatCard
                    title="Total Parcels"
                    value={stats?.totalParcels.toLocaleString() || '...'}
                    trend="+124 today"
                    trendUp={true}
                    icon={FileCheck}
                    color="blue"
                    variants={itemVariants}
                />
                <StatCard
                    title="Active Agents"
                    value="18"
                    trend="4 offline"
                    trendUp={false}
                    icon={Users}
                    color="emerald"
                    variants={itemVariants}
                />
                <StatCard
                    title="Pending Reviews"
                    value={stats?.pendingReviews.toString() || '...'}
                    trend="Action needed"
                    trendUp={false}
                    isWarning={true}
                    icon={AlertTriangle}
                    color="amber"
                    variants={itemVariants}
                />
                <StatCard
                    title="Daily Syncs"
                    value="42.5k"
                    trend="+12% vs avg"
                    trendUp={true}
                    icon={Activity}
                    color="purple"
                    variants={itemVariants}
                />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Section */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    className="lg:col-span-2 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-xl shadow-gray-200/40 dark:shadow-black/20 flex flex-col min-h-[500px]"
                >
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Sync Activity</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time packet uploads vs. processed records</p>
                        </div>
                        <div className="flex gap-2">
                            <select className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-medium px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option>Last 24 Hours</option>
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                            </select>
                        </div>
                    </div>

                    {/* Enhanced Chart */}
                    <div className="flex-1 relative w-full h-full min-h-[300px]">
                        <SyncActivityChart />
                    </div>
                </motion.div>

                {/* Right Column: Mobile & Recent */}
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="show"
                        className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-6 shadow-xl shadow-primary-900/20 text-white relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors"></div>

                        <h3 className="text-lg font-bold mb-6 relative z-10">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <button className="bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm p-4 rounded-xl text-left transition-all">
                                <UploadCloud size={24} className="mb-3 text-primary-200" />
                                <div className="font-semibold text-sm">Upload Data</div>
                            </button>
                            <button className="bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm p-4 rounded-xl text-left transition-all">
                                <Map size={24} className="mb-3 text-primary-200" />
                                <div className="font-semibold text-sm">View Map</div>
                            </button>
                        </div>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="show"
                        className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl shadow-gray-200/40 dark:shadow-black/20"
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Clock size={18} className="text-gray-400" />
                            Recent Field Updates
                        </h3>

                        <div className="space-y-4">
                            {recentParcels.length > 0 ? (
                                recentParcels.map((p, idx) => {
                                    const statusConfig = getStatusConfig(p.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <div key={p.id || idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${statusConfig.color}`}>
                                                <StatusIcon size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors leading-tight">
                                                    Parcel #{p.khasra_number}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${statusConfig.color} bg-opacity-20`}>
                                                        {statusConfig.label}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {idx * 5 + 2}m ago
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-sm">Waiting for updates...</div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// --- Sub-components ---

function StatCard({ title, value, trend, trendUp, isWarning, icon: Icon, color, variants }: any) {
    const colors: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    };

    return (
        <motion.div
            variants={variants}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colors[color]} group-hover:scale-110 transition-transform`}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
                {trend && (
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isWarning
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : trendUp
                            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                        {trendUp && <ArrowUpRight size={12} />}
                        {trend}
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            </div>

            {/* Decoration */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity blur-2xl ${color === 'blue' ? 'bg-blue-500' :
                color === 'emerald' ? 'bg-emerald-500' :
                    color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                }`} />
        </motion.div>
    );
}

// Custom SVG Chart with Animation
function SyncActivityChart() {
    // Generate some smooth random-looking data
    const dataPoints = 20;
    const height = 300;
    const width = 800; // Viewbox width

    // Create two paths: one for filled area, one for stroke
    const generatePath = (offset: number) => {
        let path = `M0,${height}`;
        const points = [];
        for (let i = 0; i <= dataPoints; i++) {
            const x = (i / dataPoints) * width;
            // Sine wave pattern mixed with randomness
            const y = height - (Math.random() * 100 + 50 + Math.sin(i * 0.5 + offset) * 50);
            points.push({ x, y });
        }

        // Catmull-Rom like curve smoothing (simple Bezier approximation)
        path = `M0,${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            // Control points
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            const cp1y = p0.y;
            const cp2x = p0.x + (p1.x - p0.x) / 2;
            const cp2y = p1.y;
            path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
        }

        return { stroke: path, area: path + ` V${height} H0 Z` };
    };

    const [path1, setPath1] = useState(generatePath(0));
    const [path2, setPath2] = useState(generatePath(2));

    // Animate data periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setPath1(generatePath(Date.now() / 1000));
            setPath2(generatePath(Date.now() / 1000 + 2));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[...Array(5)].map((_, i) => (
                    <line
                        key={i}
                        x1="0"
                        y1={i * (height / 4)}
                        x2={width}
                        y2={i * (height / 4)}
                        stroke="currentColor"
                        className="text-gray-200 dark:text-slate-700"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* Layer 1 (Background) */}
                <motion.path
                    d={path2.area}
                    fill="url(#grad2)"
                    initial={{ d: path2.area }}
                    animate={{ d: path2.area }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                />
                <motion.path
                    d={path2.stroke}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    initial={{ d: path2.stroke }}
                    animate={{ d: path2.stroke }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                />

                {/* Layer 2 (Foreground) */}
                <motion.path
                    d={path1.area}
                    fill="url(#grad1)"
                    initial={{ d: path1.area }}
                    animate={{ d: path1.area }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                />
                <motion.path
                    d={path1.stroke}
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="3"
                    initial={{ d: path1.stroke }}
                    animate={{ d: path1.stroke }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                />
            </svg>
        </div>
    );
}
