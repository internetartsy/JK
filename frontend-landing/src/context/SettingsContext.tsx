import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ur' | 'hi';
type Theme = 'light' | 'dark';

import { translations } from '../constants/translations';


interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: Theme;
    toggleTheme: () => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        return (localStorage.getItem('app-language') as Language) || 'en';
    });

    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('app-theme') as Theme;
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        // Apply theme
        localStorage.setItem('app-theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('app-language', language);
        // Set document direction for Urdu
        document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    }, [language]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const t = (key: string): string => {
        return translations[key]?.[language] || key;
    };

    return (
        <SettingsContext.Provider value={{ language, setLanguage, theme, toggleTheme, t }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
