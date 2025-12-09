import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ur' | 'hi';
type Theme = 'light' | 'dark';

interface Translation {
    [key: string]: {
        [key in Language]: string;
    }
}

const translations: Translation = {
    'dashboard': { en: 'Dashboard', ur: 'ڈیش بورڈ', hi: 'डैशबोर्ड' },
    'map_view': { en: 'Map View', ur: 'نقشہ دیکھیں', hi: 'मानचित्र देखें' },
    'review_queue': { en: 'Review Queue', ur: 'جائزہ قطار', hi: 'समीक्षा कतार' },
    'registry': { en: 'Land Registry', ur: 'لینڈ رجسٹری', hi: 'भूमि रजिस्ट्री' },
    'settings': { en: 'Settings', ur: 'ترतीبات', hi: 'सेटिंग्स' },
    'admin_profile': { en: 'View Profile', ur: 'پروفائل دیکھیں', hi: 'प्रोफ़ाइल देखें' },
    'stats_overview': { en: 'Dashboard Overview', ur: 'ڈیش بورڈ کا جائزہ', hi: 'डैशबोर्ड अवलोकन' },
    'real_time_insights': { en: 'Real-time insights into land records digitization.', ur: 'لینڈ ریکارڈ ڈیجیٹلائزیشن میں حقیقی وقت کی بصیرت۔', hi: 'भूमि अभिलेख डिजिटलीकरण में वास्तविक समय की अंतर्दृष्टि।' },
    'total_parcels': { en: 'Total Parcels', ur: 'کل پارسل', hi: 'कुल पार्सल' },
    'active_farmers': { en: 'Active Farmers', ur: 'فعال کسان', hi: 'सक्रिय किसान' },
    'pending_reviews': { en: 'Pending Reviews', ur: 'زیر التواء جائزے', hi: 'लंबित समीक्षाएं' },
    'ocr_accuracy': { en: 'OCR Accuracy', ur: 'OCR درستگی', hi: 'OCR सटीकता' },
    'mobile_connection': { en: 'Mobile Connection', ur: 'موبائل کنکشن', hi: 'मोबाइल कनेक्शन' },
    'scan_code': { en: 'Scan code with field app', ur: ' فیلڈ ایپ کے ساتھ کوڈ اسکین کریں', hi: 'फील्ड ऐप के साथ कोड स्कैन करें' },
    'recent_activity': { en: 'Recent Activity', ur: 'حالیہ سرگرمی', hi: 'हाल की गतिविधि' },
    'profile_account': { en: 'Profile & Account', ur: 'پروفائل اور اکاؤنٹ', hi: 'प्रोफ़ाइल और खाता' },
    'full_name': { en: 'Full Name', ur: 'پورا نام', hi: 'पूरा नाम' },
    'email_address': { en: 'Email Address', ur: 'ای میل پتہ', hi: 'ईमेल पता' },
    'appearance_features': { en: 'Appearance & Features', ur: 'ظاہری شکل اور خصوصیات', hi: 'उपस्थिति और विशेषताएं' },
    'language': { en: 'Language', ur: 'زبان', hi: 'भाषा' },
    'select_language': { en: 'Select interface language', ur: 'انٹرفیس زبان منتخب کریں', hi: 'इंटरफ़ेस भाषा चुनें' },
    'dark_mode': { en: 'Dark Mode', ur: 'ڈارک موڈ', hi: 'डार्क मोड' },
    'enable_dark': { en: 'Enable dark theme', ur: 'ڈارک تھیم کو فعال کریں', hi: 'डार्क थीम सक्षम करें' },
    'notifications': { en: 'Notifications', ur: 'اطلاعات', hi: 'सूचनाएं' },
    'mobile_alerts': { en: 'Mobile Sync Alerts', ur: 'موبائل مطابقت پذیری الرٹس', hi: 'मोबाइल सिंक अलर्ट' },
    'security_logs': { en: 'Security Audit Logs', ur: 'سیکیورٹی آڈٹ لاگز', hi: 'सुरक्षा ऑडिट लॉग' },
    'save_changes': { en: 'Save Changes', ur: 'تبدیلیاں محفوظ کریں', hi: 'परिवर्तन सहेजें' }
};

interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: Theme;
    toggleTheme: () => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        // Load settings from local storage if available
        const savedLang = localStorage.getItem('app-language') as Language;
        const savedTheme = localStorage.getItem('app-theme') as Theme;

        if (savedLang) setLanguage(savedLang);
        if (savedTheme) setTheme(savedTheme);
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

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
