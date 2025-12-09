import {
    MapIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    UserGroupIcon,
    ClipboardDocumentCheckIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

interface DashboardProps {
    stats: {
        totalParcels: number;
        activeParcels: number;
        disputedParcels: number;
        totalFarmers: number;
        pendingReviews: number;
        ocrAccuracy: number;
    };
}

export default function Dashboard({ stats }: DashboardProps) {
    const statCards = [
        { name: 'Total Parcels', value: stats.totalParcels, icon: MapIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
        { name: 'Active', value: stats.activeParcels, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50' },
        { name: 'Disputed', value: stats.disputedParcels, icon: ExclamationTriangleIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
        { name: 'Farmers', value: stats.totalFarmers, icon: UserGroupIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { name: 'Pending Reviews', value: stats.pendingReviews, icon: ClipboardDocumentCheckIcon, color: 'text-pink-600', bg: 'bg-pink-50' },
        { name: 'OCR Accuracy', value: `${stats.ocrAccuracy}%`, icon: ChartBarIcon, color: 'text-teal-600', bg: 'bg-teal-50' },
    ];

    return (
        <div className="space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-secondary-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Dashboard
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((item) => (
                    <div
                        key={item.name}
                        className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
                    >
                        <dt>
                            <div className={`absolute rounded-md p-3 ${item.bg}`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-secondary-500">{item.name}</p>
                        </dt>
                        <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
                            <p className="text-2xl font-semibold text-secondary-900">{item.value}</p>
                        </dd>
                    </div>
                ))}
            </div>
        </div>
    );
}
