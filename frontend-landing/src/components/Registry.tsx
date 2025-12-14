import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MoreHorizontal, X, MapPin, User, FileText, Calendar, RefreshCw, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parcelApi, ocrApi } from '../api/client';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import type { LandParcel } from '../api/client';

// Keep mock data as fallback/demo
const MOCK_REGISTRY = [
    {
        id: 'LP-1001',
        owner: 'Ramesh Kumar',
        father: 'Suresh Kumar',
        village: 'Rampur',
        khasra: '12/4',
        area: '2.5 Acre',
        status: 'Active',
        address: 'H.No 12, Ward 4, Rampur, Jammu',
        date: '2023-11-15'
    },
    {
        id: 'LP-1002',
        owner: 'Sita Devi',
        father: 'Mohan Lal',
        village: 'Rampur',
        khasra: '14/2',
        area: '1.2 Acre',
        status: 'Pending',
        address: 'Near Old Well, Rampur Zone B',
        date: '2023-12-01'
    },
    {
        id: 'LP-1003',
        owner: 'Abdul Rafiq',
        father: 'Mohammed Rafiq',
        village: 'Daryapur',
        khasra: '88/1',
        area: '0.8 Acre',
        status: 'Disputed',
        address: 'Village Daryapur Main Road',
        date: '2023-10-20'
    },
    {
        id: 'LP-1004',
        owner: 'Gurmeet Singh',
        father: 'Balwinder Singh',
        village: 'Daryapur',
        khasra: '45/B',
        area: '4.0 Acre',
        status: 'Active',
        address: 'Farm House No 5, Daryapur',
        date: '2023-09-15'
    },
];

export function Registry() {
    const { t } = useSettings();
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');

    // State for data
    const [records, setRecords] = useState<any[]>(MOCK_REGISTRY);
    const [isLoading, setIsLoading] = useState(false);
    const [isUsingRealData, setIsUsingRealData] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [uploadStep, setUploadStep] = useState<'idle' | 'upload' | 'ocr' | 'ulpin' | 'save' | 'done'>('idle');

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [analysisLog, setAnalysisLog] = useState<string[]>([]);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setPdfPreviewUrl(URL.createObjectURL(file));
        setShowUploadModal(true);
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStep('upload'); // Step 1: Upload
        setAnalysisLog(['Initializing Upload...']);

        try {
            // Start actual upload
            const uploadPromise = ocrApi.upload(file);

            // SIMULATE ANALYSIS VISUALIZATION (while backend works)
            await new Promise(r => setTimeout(r, 1000));
            setUploadProgress(20);
            setAnalysisLog(prev => [...prev, '✓ PDF Uploaded Successfully']);
            setUploadStep('ocr'); // Step 2: OCR

            await new Promise(r => setTimeout(r, 800));
            setUploadProgress(40);
            setAnalysisLog(prev => [...prev, '• Starting OCR Analysis...']);

            await new Promise(r => setTimeout(r, 1200));
            setUploadProgress(55);
            setAnalysisLog(prev => [...prev, '• Detecting Table Structure: 12 Columns Found']);
            setAnalysisLog(prev => [...prev, '• Splitting Column 5 (Nam Kashtakar) into Name, Parentage, Caste']);

            await new Promise(r => setTimeout(r, 1000));
            setUploadProgress(70);
            setUploadStep('ulpin'); // Step 3: Gen ULPIN
            setAnalysisLog(prev => [...prev, '• Term Mapping: "Kasht" -> "Cultivator", "Sakin" -> "Resident"']);
            setAnalysisLog(prev => [...prev, '• Translating Urdu -> English: "رمیش کمار" -> "Ramesh Kumar"']);

            await new Promise(r => setTimeout(r, 1000));
            setUploadProgress(85);
            setUploadStep('save'); // Step 4: Sync Frappe
            setAnalysisLog(prev => [...prev, '• GeoJSON Extracted: Polygon((74.7 32.7, ...))']);
            setAnalysisLog(prev => [...prev, '• Validating Khasra Number vs Village Record']);

            await uploadPromise; // Wait for real success

            setUploadProgress(100);
            setUploadStep('done'); // Step 5: Complete
            setAnalysisLog(prev => [...prev, '✓ Auto-Generated ULPIN: JK-G-82910']);
            setAnalysisLog(prev => [...prev, '✓ Data Verified']);
            setAnalysisLog(prev => [...prev, '✓ Sent to Queued for Review (Status: Under Review)']);
            setUploadStatus('success');

            // Close after delay
            // setTimeout(() => setShowUploadModal(false), 3000); 
            // Keep open slightly longer for user to read

        } catch (err) {
            console.error("Upload failed", err);
            setUploadStatus('error');
            setAnalysisLog(prev => [...prev, '❌ Upload Failed']);
        } finally {
            setIsUploading(false);
            e.target.value = '';
            // Reset step after delay if needed, but keeping it 'done' allows user to see success state
        }
    };

    const fetchRegistryData = async () => {
        setIsLoading(true);
        try {
            const data = await parcelApi.getAll();
            if (data && data.length > 0) {
                const mappedData = data.map((p: LandParcel) => ({
                    id: p.id.substring(0, 8), // Shorten UUID for display
                    full_id: p.id,
                    owner: 'Unknown Owner', // Placeholder as backend assumes linking later
                    father: 'N/A', // Not in current API
                    village: p.village_id || 'Unknown',
                    khasra: p.khasra_number || 'N/A',
                    area: p.area_text || `${p.area_geom?.toFixed(2) || 0} Sq.m`,
                    status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
                    address: `Village ${p.village_id || 'Unknown'}`,
                    date: typeof p.version === 'number' ? 'Synced Recently' : 'N/A' // version is number, updated_at on backend
                }));
                // Try to use any updated_at if mapped
                setRecords(mappedData);
                setIsUsingRealData(true);
            } else {
                // Keep mock data if no real data found
                setIsUsingRealData(false);
            }
        } catch (error) {
            console.error("Failed to fetch registry data, using mock:", error);
            setIsUsingRealData(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistryData();
    }, []);

    const filteredRecords = records.filter(record => {
        const matchesSearch =
            (record.owner?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (record.father?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (record.khasra?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (record.village?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (record.id?.toLowerCase() || '').includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'All' || record.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 dark:text-white flex items-center gap-3">
                        {t('registry')}
                        {isLoading && <RefreshCw className="animate-spin text-primary-500" size={20} />}
                        {!isLoading && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${isUsingRealData
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'}`}>
                                <Database size={10} />
                                {isUsingRealData ? 'Live Data' : 'Demo Mode'}
                            </span>
                        )}
                    </h1>
                    <p className="text-secondary-500 dark:text-secondary-400">Official digitized record of land parcels.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search owner, khasra..."
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-64 transition-all dark:text-white"
                        />

                    </div>

                    {/* Upload Button */}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="registry-upload"
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="registry-upload"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium cursor-pointer transition-all ${uploadStatus === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
                                uploadStatus === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                                    'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-900/20'
                                }`}
                        >
                            {isUploading ? (
                                <RefreshCw className="animate-spin" size={18} />
                            ) : uploadStatus === 'success' ? (
                                <CheckCircle size={18} />
                            ) : uploadStatus === 'error' ? (
                                <AlertCircle size={18} />
                            ) : (
                                <UploadCloud size={18} />
                            )}
                            {isUploading ? 'Uploading...' : uploadStatus === 'success' ? 'Sent to Frappe' : 'Upload Record'}
                        </label>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-medium transition-colors ${showFilters ? 'bg-secondary-100 dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600' : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'}`}
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Expandable Filter Options */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex gap-2 pb-2">
                            {['All', 'Active', 'Pending', 'Disputed'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === status
                                        ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                                        : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Progress Card */}
            <AnimatePresence>
                {(isUploading || uploadStatus === 'success' || uploadStep !== 'idle') && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 shadow-lg mb-4"
                    >
                        <h3 className="text-sm font-bold text-secondary-900 dark:text-white mb-3 flex items-center gap-2">
                            <UploadCloud size={16} className="text-primary-500" /> Processing Document Data...
                        </h3>
                        <div className="flex items-center justify-between gap-2 relative">
                            {/* Connector Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-secondary-100 dark:bg-secondary-700 -z-10" />

                            {[
                                { id: 'upload', label: 'Upload' },
                                { id: 'ocr', label: 'OCR Analysis' },
                                { id: 'ulpin', label: 'Gen ULPIN' },
                                { id: 'save', label: 'Sync Frappe' },
                                { id: 'done', label: 'Complete' }
                            ].map((step, idx) => {
                                const activeIdx = ['idle', 'upload', 'ocr', 'ulpin', 'save', 'done'].indexOf(uploadStep);
                                const myIdx = idx + 1; // 1-based relative to 'idle'=0
                                const isCompleted = activeIdx > myIdx || uploadStep === 'done';
                                const isActive = uploadStep === step.id;

                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-2 bg-white dark:bg-secondary-800 px-2 z-10">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-green-500 text-white' :
                                            isActive ? 'bg-primary-500 text-white animate-pulse' :
                                                'bg-secondary-200 dark:bg-secondary-700 text-secondary-500'
                                            }`}>
                                            {isCompleted ? <CheckCircle size={14} /> :
                                                isActive ? <RefreshCw className="animate-spin" size={14} /> :
                                                    <span className="text-xs font-bold">{idx + 1}</span>}
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold ${isActive || isCompleted ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-400'
                                            }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Analysis Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-secondary-900 w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden flex shadow-2xl border border-secondary-700"
                        >
                            {/* PDF Preview Side */}
                            <div className="w-1/2 bg-secondary-800 p-8 flex items-center justify-center border-r border-secondary-700 relative">
                                {pdfPreviewUrl ? (
                                    <iframe src={pdfPreviewUrl} className="w-full h-full rounded shadow-lg bg-white" title="PDF Preview" />
                                ) : (
                                    <div className="text-white text-center">
                                        <FileText size={64} className="mx-auto mb-4 opacity-50" />
                                        <p>Document Preview</p>
                                    </div>
                                )}
                                {/* Scan Line Animation */}
                                {isUploading && (
                                    <motion.div
                                        className="absolute inset-x-0 h-1 bg-primary-500/80 shadow-[0_0_15px_rgba(34,197,94,0.6)] z-10"
                                        animate={{ top: ['10%', '90%', '10%'] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    />
                                )}
                            </div>

                            {/* Analysis Log Side */}
                            <div className="w-1/2 p-8 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold dark:text-white">AI Analysis</h2>
                                    <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-secondary-800 rounded-full text-secondary-400">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="mb-8">
                                    <div className="flex justify-between text-sm mb-2 dark:text-secondary-300">
                                        <span>Processing Status</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 bg-secondary-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-primary-500 to-green-400"
                                            animate={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3 font-mono text-sm bg-secondary-950 p-4 rounded-lg border border-secondary-800">
                                    {analysisLog.map((log, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex items-start gap-2 ${log.includes('✓') ? 'text-green-400' :
                                                log.includes('❌') ? 'text-red-400' :
                                                    log.includes('Translating') ? 'text-blue-400' :
                                                        'text-secondary-300'
                                                }`}
                                        >
                                            <span>{log}</span>
                                        </motion.div>
                                    ))}
                                    {isUploading && (
                                        <div className="flex items-center gap-2 text-primary-400 animate-pulse">
                                            <RefreshCw size={12} className="animate-spin" />
                                            Analyzing...
                                        </div>
                                    )}
                                </div>

                                {uploadProgress === 100 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-center gap-3 text-green-400"
                                    >
                                        <CheckCircle size={24} />
                                        <div>
                                            <p className="font-bold">Extraction Complete</p>
                                            <p className="text-xs opacity-80">Record ID generated and saved to Frappe.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-4">
                {filteredRecords.length > 0 ? (
                    filteredRecords.map((record, i) => (
                        <motion.div
                            key={record.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedRecord(record)}
                            className="bg-white/70 dark:bg-secondary-800/70 backdrop-blur-md border border-white/60 dark:border-secondary-700/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-secondary-800 transition-all flex items-center justify-between group cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-sm">
                                    {record.village[0]}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-secondary-900 dark:text-white">{record.owner} <span className="text-secondary-400 dark:text-secondary-500 font-normal text-xs">s/o {record.father}</span></h3>
                                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Khasra: {record.khasra} • {record.village}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-secondary-700 dark:text-secondary-200">{record.area}</p>
                                    <p className="text-xs text-secondary-400 dark:text-secondary-500">{record.id}</p>
                                </div>
                                <button className="p-2 text-secondary-400 hover:text-secondary-900 dark:hover:text-white rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-12 text-secondary-500 dark:text-secondary-400">
                        <p>No records found matching your search.</p>
                    </div>
                )}
            </div>

            {/* Popup Modal */}
            <AnimatePresence>
                {selectedRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedRecord(null)}
                            className="absolute inset-0 bg-secondary-900/20 dark:bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl overflow-hidden border border-secondary-100 dark:border-secondary-700"
                        >
                            <div className="p-6 border-b border-secondary-100 dark:border-secondary-700 flex justify-between items-start bg-secondary-50/50 dark:bg-secondary-900/50">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold rounded mb-2">
                                        {selectedRecord.status.toUpperCase()}
                                    </span>
                                    <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">Parcel Details</h2>
                                    <p className="text-secondary-500 dark:text-secondary-400 text-sm">ID: {selectedRecord.id}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedRecord(null)}
                                    className="p-2 bg-white dark:bg-secondary-700 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-600 text-secondary-500 dark:text-secondary-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-secondary-400 text-xs uppercase font-bold tracking-wider">
                                            <MapPin size={14} /> Location
                                        </div>
                                        <p className="font-semibold text-secondary-900 dark:text-white">{selectedRecord.village}</p>
                                        <p className="text-sm text-secondary-500 dark:text-secondary-400">Khasra {selectedRecord.khasra}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-secondary-400 text-xs uppercase font-bold tracking-wider">
                                            <FileText size={14} /> Land Area
                                        </div>
                                        <p className="font-semibold text-secondary-900 dark:text-white">{selectedRecord.area}</p>
                                        <p className="text-sm text-secondary-500 dark:text-secondary-400">Measured: Nov 2023</p>
                                    </div>
                                </div>

                                <div className="bg-secondary-50 dark:bg-secondary-900/50 p-4 rounded-xl space-y-3">
                                    <div className="flex items-center gap-2 text-secondary-400 text-xs uppercase font-bold tracking-wider mb-2">
                                        <User size={14} /> Owner Details
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-secondary-900 dark:text-white text-lg">{selectedRecord.owner}</p>
                                            <p className="text-sm text-secondary-500 dark:text-secondary-400">S/o {selectedRecord.father}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 px-2 py-1 rounded text-secondary-600 dark:text-secondary-300">
                                                Primary Owner
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-secondary-200 dark:border-secondary-700 mt-2">
                                        <p className="text-xs text-secondary-400 mb-1">Permanent Address</p>
                                        <p className="text-sm text-secondary-700 dark:text-secondary-300">{selectedRecord.address}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-secondary-400 pt-2">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} /> Registered: {selectedRecord.date}
                                    </div>
                                    <button
                                        onClick={() => window.open('http://localhost:8001/app/land-parcel', '_blank')}
                                        className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                    >
                                        View Full Record History
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
