/**
 * Transliteration utilities and hint component
 * Provides Urdu to English romanization hints
 */

import { useMemo } from 'react';
import { Languages } from 'lucide-react';

// Common transliteration dictionary
export const transliterationDictionary: Record<string, string[]> = {
    // Common names
    'محمد': ['Muhammad', 'Mohammad', 'Mohammed'],
    'احمد': ['Ahmad', 'Ahmed'],
    'علی': ['Ali'],
    'حسن': ['Hassan', 'Hasan'],
    'حسین': ['Hussain', 'Hussein', 'Husain'],
    'عبدالرحمن': ['Abdul Rahman', 'Abdur Rahman'],
    'عبداللہ': ['Abdullah', 'Abdulla'],
    'خان': ['Khan'],
    'ملک': ['Malik'],
    'شیخ': ['Sheikh', 'Shaikh'],
    'چوہدری': ['Chaudhry', 'Chaudhary', 'Choudhry'],
    'راجہ': ['Raja'],
    'بٹ': ['Butt', 'Bhatt'],
    'قریشی': ['Qureshi', 'Quraishi'],

    // Common places
    'لاہور': ['Lahore'],
    'کراچی': ['Karachi'],
    'اسلام آباد': ['Islamabad'],
    'راولپنڈی': ['Rawalpindi'],
    'فیصل آباد': ['Faisalabad'],
    'ملتان': ['Multan'],
    'پشاور': ['Peshawar'],
    'گوجرانوالہ': ['Gujranwala'],
    'سیالکوٹ': ['Sialkot'],
    'چک': ['Chak'],
    'موضع': ['Mouza', 'Mauza'],

    // Land record terms
    'خسرہ': ['Khasra'],
    'کھاتہ': ['Khata'],
    'حدباست': ['Hadbast'],
    'گرداوری': ['Girdawari'],
    'کنال': ['Kanal'],
    'مرلہ': ['Marla'],
    'ایکڑ': ['Acre'],
    'رقبہ': ['Raqba', 'Area'],
    'مالک': ['Malik', 'Owner'],
    'ولد': ['s/o', 'son of'],
    'بنت': ['d/o', 'daughter of'],

    // Crops
    'گندم': ['Wheat', 'Gandum'],
    'چاول': ['Rice', 'Chawal'],
    'مکئی': ['Maize', 'Corn'],
    'کپاس': ['Cotton', 'Kapas'],
    'گنا': ['Sugarcane', 'Ganna'],
    'سرسوں': ['Mustard', 'Sarson'],
    'چنا': ['Gram', 'Chana', 'Chickpea'],
};

// Urdu character to Latin mapping for basic transliteration
const urduToLatin: Record<string, string> = {
    'ا': 'a',
    'آ': 'aa',
    'ب': 'b',
    'پ': 'p',
    'ت': 't',
    'ٹ': 't',
    'ث': 's',
    'ج': 'j',
    'چ': 'ch',
    'ح': 'h',
    'خ': 'kh',
    'د': 'd',
    'ڈ': 'd',
    'ذ': 'z',
    'ر': 'r',
    'ڑ': 'r',
    'ز': 'z',
    'ژ': 'zh',
    'س': 's',
    'ش': 'sh',
    'ص': 's',
    'ض': 'z',
    'ط': 't',
    'ظ': 'z',
    'ع': 'a',
    'غ': 'gh',
    'ف': 'f',
    'ق': 'q',
    'ک': 'k',
    'گ': 'g',
    'ل': 'l',
    'م': 'm',
    'ن': 'n',
    'ں': 'n',
    'و': 'o',
    'ہ': 'h',
    'ھ': 'h',
    'ی': 'i',
    'ے': 'e',
    'ئ': 'i',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
    ' ': ' ',
};

/**
 * Basic transliteration of Urdu text to Latin script
 */
export function transliterate(urdu: string): string {
    // First check dictionary for known words
    const words = urdu.trim().split(/\s+/);
    const transliterated = words.map(word => {
        // Check dictionary
        if (transliterationDictionary[word]) {
            return transliterationDictionary[word][0];
        }

        // Character-by-character transliteration
        let result = '';
        for (const char of word) {
            result += urduToLatin[char] || char;
        }
        return result;
    });

    return transliterated.join(' ');
}

/**
 * Get all transliteration suggestions for a word
 */
export function getSuggestions(urdu: string): string[] {
    const words = urdu.trim().split(/\s+/);
    const suggestions: Set<string> = new Set();

    for (const word of words) {
        if (transliterationDictionary[word]) {
            transliterationDictionary[word].forEach(s => suggestions.add(s));
        }
    }

    // Add basic transliteration if no dictionary matches
    if (suggestions.size === 0) {
        suggestions.add(transliterate(urdu));
    }

    return Array.from(suggestions);
}

interface TransliterationHintProps {
    text: string;
    onSelect?: (english: string) => void;
    showIcon?: boolean;
}

export function TransliterationHint({ text, onSelect, showIcon = true }: TransliterationHintProps) {
    const suggestions = useMemo(() => {
        if (!text || text.length < 2) return [];

        // Check if text contains Urdu characters
        const hasUrdu = /[\u0600-\u06FF]/.test(text);
        if (!hasUrdu) return [];

        return getSuggestions(text);
    }, [text]);

    if (suggestions.length === 0) return null;

    return (
        <div className="mt-1 flex flex-wrap items-center gap-2">
            {showIcon && (
                <Languages className="w-3 h-3 text-secondary-400" />
            )}
            {suggestions.map((suggestion, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onSelect?.(suggestion)}
                    className="inline-flex items-center px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
}

export default TransliterationHint;
