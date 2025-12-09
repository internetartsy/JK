import { motion } from 'framer-motion';
import { Bell, Moon, Shield, Globe } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function Settings() {
    const { language, setLanguage, theme, toggleTheme, t } = useSettings();

    return (
        <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">{t('settings')}</h1>
                <p className="text-secondary-500 dark:text-secondary-400">Manage application preferences and system configurations.</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/70 dark:bg-secondary-800/70 backdrop-blur-xl border border-white/50 dark:border-secondary-700/50 rounded-2xl p-6 shadow-sm"
                >
                    <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 border-b border-secondary-100 dark:border-secondary-700 pb-2">
                        {t('profile_account')}
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">{t('full_name')}</label>
                            <input type="text" defaultValue="Admin User" className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">{t('email_address')}</label>
                            <input type="email" defaultValue="admin@jk-landrecords.gov.in" className="w-full rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                        </div>
                    </div>
                </motion.div>

                {/* Appearance & System */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/70 dark:bg-secondary-800/70 backdrop-blur-xl border border-white/50 dark:border-secondary-700/50 rounded-2xl p-6 shadow-sm"
                >
                    <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 border-b border-secondary-100 dark:border-secondary-700 pb-2">
                        {t('appearance_features')}
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-secondary-700/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Globe size={20} /></div>
                                <div>
                                    <p className="font-medium text-secondary-900 dark:text-white">{t('language')}</p>
                                    <p className="text-xs text-secondary-500 dark:text-secondary-400">{t('select_language')}</p>
                                </div>
                            </div>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as any)}
                                className="rounded-lg border-secondary-300 dark:border-secondary-600 dark:bg-secondary-900 dark:text-white text-sm focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="en">English</option>
                                <option value="ur">Urdu (اردو)</option>
                                <option value="hi">Hindi (हिंदी)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 dark:hover:bg-secondary-700/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Moon size={20} /></div>
                                <div>
                                    <p className="font-medium text-secondary-900 dark:text-white">{t('dark_mode')}</p>
                                    <p className="text-xs text-secondary-500 dark:text-secondary-400">{t('enable_dark')}</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={theme === 'dark'}
                                    onChange={toggleTheme}
                                />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-secondary-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                    </div>
                </motion.div>

                {/* Notifications */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/70 dark:bg-secondary-800/70 backdrop-blur-xl border border-white/50 dark:border-secondary-700/50 rounded-2xl p-6 shadow-sm"
                >
                    <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 border-b border-secondary-100 dark:border-secondary-700 pb-2">
                        {t('notifications')}
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bell className="text-secondary-400" size={20} />
                                <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{t('mobile_alerts')}</span>
                            </div>
                            <input type="checkbox" defaultChecked className="rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield className="text-secondary-400" size={20} />
                                <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{t('security_logs')}</span>
                            </div>
                            <input type="checkbox" defaultChecked className="rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500" />
                        </div>
                    </div>
                </motion.div>

                {/* Save button removed as per user request (changes are instant) */}
            </div>
        </div>
    );
}
