import { useAuth } from 'react-oidc-context';
import { Home, Map, FileText, Database, Settings, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface SidebarProps {
    currentView: string;
    onChangeView: (view: string) => void;
}

export function Sidebar({ currentView, onChangeView }: SidebarProps) {
    const auth = useAuth();
    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'map', icon: Map, label: 'Map View' },
        { id: 'review', icon: FileText, label: 'Review Queue' },
        { id: 'registry', icon: Database, label: 'Land Registry' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="h-screen w-20 lg:w-64 bg-white/80 dark:bg-secondary-900/95 backdrop-blur-md border-r border-secondary-200 dark:border-secondary-800 flex flex-col shadow-2xl z-20 transition-colors"
        >
            <div className="p-6 flex items-center gap-3 justify-center lg:justify-start">
                <span className="font-bold text-xl text-secondary-900 dark:text-white hidden lg:block tracking-tight">AgriStack</span>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2">
                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id)}
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
                            <span className="font-medium hidden lg:block">{item.label}</span>
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-primary-100/10 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-secondary-100 dark:border-secondary-800">
                {auth.isAuthenticated ? (
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-secondary-50/50 dark:bg-secondary-800/50">
                        <div className="w-8 h-8 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center text-xs font-bold text-secondary-600 dark:text-secondary-300 overflow-hidden">
                            {auth.user?.profile.name?.[0] || auth.user?.profile.preferred_username?.[0] || 'U'}
                        </div>
                        <div className="hidden lg:block flex-1 min-w-0">
                            <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 truncate">
                                {auth.user?.profile.name || auth.user?.profile.preferred_username || 'User'}
                            </p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                                {auth.user?.profile.email}
                            </p>
                        </div>
                        <button
                            onClick={() => auth.removeUser()}
                            className="hidden lg:flex p-1.5 text-secondary-400 dark:text-secondary-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Log Out"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => auth.signinRedirect()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-lg shadow-primary-500/30"
                    >
                        <LogIn size={20} />
                        <span className="font-medium hidden lg:block">Sign In</span>
                    </button>
                )}
            </div>
        </motion.div>
    );
}
