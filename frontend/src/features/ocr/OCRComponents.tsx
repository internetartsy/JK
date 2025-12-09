import { useMemo } from 'react';
import { FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { OCRResult, OCRBlock, OCRWord } from './TesseractOCR';

interface ConfidenceBadgeProps {
    confidence: number;
    size?: 'sm' | 'md' | 'lg';
}

function ConfidenceBadge({ confidence, size = 'md' }: ConfidenceBadgeProps) {
    const color = confidence > 80 ? 'bg-green-500' : confidence > 50 ? 'bg-yellow-500' : 'bg-red-500';
    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    return (
        <span className={`inline-flex items-center rounded-full ${color} text-white font-medium ${sizeClasses[size]}`}>
            {Math.round(confidence)}%
        </span>
    );
}

interface OCRProgressDisplayProps {
    status: string;
    progress: number;
}

export function OCRProgressDisplay({ status, progress }: OCRProgressDisplayProps) {
    return (
        <div className="bg-white dark:bg-secondary-800 rounded-xl p-6 shadow-lg border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
                        Processing Document
                    </h3>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400">{status}</p>
                </div>
            </div>

            <div className="relative h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300 ease-out"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>
            <p className="text-right text-sm text-secondary-500 mt-2">
                {Math.round(progress * 100)}%
            </p>
        </div>
    );
}

interface OCRWordHighlightProps {
    word: OCRWord;
    imageWidth: number;
    imageHeight: number;
    isSelected?: boolean;
    onClick?: (word: OCRWord) => void;
}

function OCRWordHighlight({ word, imageWidth, imageHeight, isSelected, onClick }: OCRWordHighlightProps) {
    const style = useMemo(() => {
        const scaleX = 100 / imageWidth;
        const scaleY = 100 / imageHeight;

        return {
            left: `${word.bbox.x0 * scaleX}%`,
            top: `${word.bbox.y0 * scaleY}%`,
            width: `${(word.bbox.x1 - word.bbox.x0) * scaleX}%`,
            height: `${(word.bbox.y1 - word.bbox.y0) * scaleY}%`,
        };
    }, [word.bbox, imageWidth, imageHeight]);

    const confidenceColor = word.confidence > 80
        ? 'border-green-500/60 bg-green-500/10'
        : word.confidence > 50
            ? 'border-yellow-500/60 bg-yellow-500/10'
            : 'border-red-500/60 bg-red-500/10';

    return (
        <div
            className={`absolute border-2 cursor-pointer transition-all hover:scale-105 ${confidenceColor} ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                }`}
            style={style}
            onClick={() => onClick?.(word)}
            title={`"${word.text}" (${Math.round(word.confidence)}% confidence)`}
        />
    );
}

interface OCRResultOverlayProps {
    result: OCRResult;
    imageWidth: number;
    imageHeight: number;
    selectedWord?: OCRWord | null;
    onWordClick?: (word: OCRWord) => void;
    showLowConfidence?: boolean;
}

export function OCRResultOverlay({
    result,
    imageWidth,
    imageHeight,
    selectedWord,
    onWordClick,
    showLowConfidence = true,
}: OCRResultOverlayProps) {
    const words = useMemo(() => {
        const allWords: OCRWord[] = [];
        for (const block of result.blocks) {
            for (const line of block.lines) {
                for (const word of line.words) {
                    if (showLowConfidence || word.confidence > 50) {
                        allWords.push(word);
                    }
                }
            }
        }
        return allWords;
    }, [result.blocks, showLowConfidence]);

    return (
        <div className="absolute inset-0 pointer-events-none">
            {words.map((word, index) => (
                <OCRWordHighlight
                    key={`${word.text}-${index}`}
                    word={word}
                    imageWidth={imageWidth}
                    imageHeight={imageHeight}
                    isSelected={selectedWord === word}
                    onClick={onWordClick}
                />
            ))}
        </div>
    );
}

interface OCRResultCardProps {
    result: OCRResult;
    showFullText?: boolean;
}

export function OCRResultCard({ result, showFullText = false }: OCRResultCardProps) {
    const stats = useMemo(() => {
        let totalWords = 0;
        let lowConfidenceWords = 0;
        let rtlWords = 0;

        for (const block of result.blocks) {
            for (const line of block.lines) {
                for (const word of line.words) {
                    totalWords++;
                    if (word.confidence < 50) lowConfidenceWords++;
                    if (word.direction === 'rtl') rtlWords++;
                }
            }
        }

        return {
            totalWords,
            lowConfidenceWords,
            rtlWords,
            ltrWords: totalWords - rtlWords,
            processingTime: result.processingTime,
        };
    }, [result]);

    return (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6" />
                        <h3 className="font-semibold text-lg">OCR Results</h3>
                    </div>
                    <ConfidenceBadge confidence={result.confidence} size="lg" />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-secondary-200 dark:border-secondary-700">
                <div className="text-center">
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                        {stats.totalWords}
                    </p>
                    <p className="text-xs text-secondary-500">Words</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                        {stats.rtlWords}
                    </p>
                    <p className="text-xs text-secondary-500">Urdu</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                        {stats.ltrWords}
                    </p>
                    <p className="text-xs text-secondary-500">English</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                        {(stats.processingTime / 1000).toFixed(1)}s
                    </p>
                    <p className="text-xs text-secondary-500">Time</p>
                </div>
            </div>

            {/* Confidence breakdown */}
            <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                    Confidence Distribution
                </h4>
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden flex">
                    <div
                        className="bg-green-500 h-full"
                        style={{ width: `${((stats.totalWords - stats.lowConfidenceWords) / stats.totalWords) * 100}%` }}
                    />
                    <div
                        className="bg-red-500 h-full"
                        style={{ width: `${(stats.lowConfidenceWords / stats.totalWords) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-secondary-500 mt-2">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        High confidence: {stats.totalWords - stats.lowConfidenceWords}
                    </span>
                    <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        Low confidence: {stats.lowConfidenceWords}
                    </span>
                </div>
            </div>

            {/* Full text */}
            {showFullText && (
                <div className="p-4">
                    <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                        Extracted Text
                    </h4>
                    <div className="bg-secondary-50 dark:bg-secondary-900 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <p className="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap font-mono leading-relaxed" dir="auto">
                            {result.text}
                        </p>
                    </div>
                </div>
            )}

            {/* Languages */}
            <div className="px-4 pb-4">
                <div className="flex items-center gap-2 text-xs text-secondary-500">
                    <span>Languages:</span>
                    {result.languages.map((lang) => (
                        <span key={lang} className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded">
                            {lang === 'urd' ? 'اردو' : lang === 'eng' ? 'English' : lang}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface OCRBlockViewProps {
    block: OCRBlock;
    onLineClick?: (text: string) => void;
}

export function OCRBlockView({ block, onLineClick }: OCRBlockViewProps) {
    return (
        <div className="bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-secondary-900 dark:text-secondary-100">Text Block</h4>
                <ConfidenceBadge confidence={block.confidence} size="sm" />
            </div>

            <div className="space-y-2">
                {block.lines.map((line, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 cursor-pointer transition-colors"
                        onClick={() => onLineClick?.(line.text)}
                        dir={line.words[0]?.direction === 'rtl' ? 'rtl' : 'ltr'}
                    >
                        <div className="flex-1">
                            <p className="text-secondary-800 dark:text-secondary-200">{line.text}</p>
                        </div>
                        <ConfidenceBadge confidence={line.confidence} size="sm" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default {
    OCRProgressDisplay,
    OCRResultOverlay,
    OCRResultCard,
    OCRBlockView,
};
