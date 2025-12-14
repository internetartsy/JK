import { useAuth } from 'react-oidc-context';
import { Home, Map, FileText, Database, Settings, LogIn, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface SidebarProps {
    currentView: string;
    onChangeView: (view: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ currentView, onChangeView, isOpen, onClose }: SidebarProps) {
    const auth = useAuth();
    const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';
    // Default to 'Dev Officer' if not authenticated (Demo Mode)
    const displayUser = auth.user?.profile || {
        name: 'Dev Officer',
        preferred_username: 'dev_admin',
        email: 'dev@agristack.gov'
    };

    // Always show profile view (treat as authenticated for UI)
    const showProfile = true;

    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'map', icon: Map, label: 'Map View' },
        { id: 'review', icon: FileText, label: 'Review Queue' },
        { id: 'registry', icon: Database, label: 'Land Registry' },
        { id: 'data-cleaning', icon: ShieldCheck, label: 'Data Cleaning' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    const handleItemClick = (id: string) => {
        onChangeView(id);
        onClose(); // Close sidebar on mobile when item clicked
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <div
                className={clsx(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-white/80 dark:bg-secondary-900/95 backdrop-blur-md border-r border-secondary-200 dark:border-secondary-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="p-6 flex items-center justify-between">
                    <span className="font-bold text-xl text-secondary-900 dark:text-white tracking-tight">AgriStack</span>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 lg:hidden"
                    >
                        <X size={20} className="text-secondary-500" />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item.id)}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm"
                                        : "text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-200"
                                )}
                            >
                                <item.icon
                                    size={22}
                                    className={clsx(
                                        "transition-colors",
                                        isActive ? "text-primary-600 dark:text-primary-400" : "text-secondary-400 dark:text-secondary-500 group-hover:text-secondary-600 dark:group-hover:text-secondary-300"
                                    )}
                                />
                                <span className="font-medium">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 bg-primary-100/10 rounded-xl pointer-events-none"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-secondary-100 dark:border-secondary-800">
                    {showProfile ? (
                        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-secondary-50/50 dark:bg-secondary-800/50">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 flex-shrink-0">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-secondary-900 dark:text-secondary-100 truncate">
                                    {displayUser?.name || 'Official User'}
                                </p>
                                <button
                                    onClick={() => {
                                        if (isDebug) {
                                            window.location.href = '/';
                                        } else {
                                            auth.removeUser();
                                        }
                                    }}
                                    className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => auth.signinRedirect()}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-lg shadow-primary-500/30"
                        >
                            <LogIn size={20} />
                            <span className="font-medium">Sign In</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
