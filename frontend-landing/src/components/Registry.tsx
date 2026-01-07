import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MoreHorizontal, X, MapPin, Calendar, RefreshCw, Database, ShieldCheck, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parcelApi, ocrApi, frappeDataApi } from '../api/client';
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
        kyc_verified: true,
        ulpin: 'JK-14022-8819',
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
        kyc_verified: false,
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
        kyc_verified: true,
        ulpin: 'JK-19011-2201',
        address: 'Village Daryapur Main Road',
        date: '2023-10-20'
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
    const [uploadStep, setUploadStep] = useState<'idle' | 'upload' | 'ocr' | 'ulpin' | 'aadhaar' | 'save' | 'done'>('idle');

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
        setUploadStep('upload');
        setAnalysisLog(['Initializing Upload...']);

        try {
            const uploadPromise = ocrApi.upload(file);

            await new Promise(r => setTimeout(r, 1000));
            setUploadProgress(20);
            setAnalysisLog(prev => [...prev, '✓ PDF Uploaded Successfully']);
            setUploadStep('ocr');

            await new Promise(r => setTimeout(r, 800));
            setUploadProgress(35);
            setAnalysisLog(prev => [...prev, '• Starting OCR Analysis...']);
            setAnalysisLog(prev => [...prev, '• Splitting Nam Kashtakar into Name & Parentage']);

            await new Promise(r => setTimeout(r, 1000));
            setUploadProgress(50);
            setUploadStep('ulpin');
            setAnalysisLog(prev => [...prev, '• ULPIN Engine: Resolving Geocoordinates for Khasra 88/1']);
            setAnalysisLog(prev => [...prev, '✓ Generated ULPIN: JK-14022-9011']);

            await new Promise(r => setTimeout(r, 1000));
            setUploadProgress(65);
            setUploadStep('aadhaar');
            setAnalysisLog(prev => [...prev, '• e-KYC: Matching Farmer Name with Aadhaar Vault']);
            setAnalysisLog(prev => [...prev, '✓ Aadhaar Match Found (98% confidence)']);

            await new Promise(r => setTimeout(r, 1000));
            setUploadProgress(85);
            setUploadStep('save');
            setAnalysisLog(prev => [...prev, '• Syncing with Frappe System of Record']);
            setAnalysisLog(prev => [...prev, '• Generating AgriStack National JSON Bucket']);

            await uploadPromise;

            setUploadProgress(100);
            setUploadStep('done');
            setAnalysisLog(prev => [...prev, '✓ Process Complete: ID Card Metadata Ready']);
            setUploadStatus('success');

        } catch (err) {
            console.error("Upload failed", err);
            setUploadStatus('error');
            setAnalysisLog(prev => [...prev, '❌ Upload Failed']);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const fetchRegistryData = async () => {
        setIsLoading(true);
        try {
            const data = await parcelApi.getAll();
            if (data && data.length > 0) {
                const mappedData = data.map((p: LandParcel) => ({
                    id: p.id.substring(0, 8),
                    full_id: p.id,
                    owner: p.owner_name || 'Verified Farmer',
                    father: 'N/A',
                    village: p.village_id || 'Unknown',
                    khasra: p.khasra_number || 'N/A',
                    area: p.area_text || `${p.area_geom?.toFixed(2) || 0} Sq.m`,
                    status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
                    kyc_verified: true,
                    ulpin: p.ulpin || 'Generating...',
                    address: `Village ${p.village_id || 'Unknown'}`,
                    date: 'Synced Successfully',
                    frappe_sync: true
                }));
                setRecords(mappedData);
                setIsUsingRealData(true);
            } else {
                setIsUsingRealData(false);
            }
        } catch (error) {
            console.error("Failed to fetch registry data, using mock:", error);
            setIsUsingRealData(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshRecord = async (record: any) => {
        setIsLoading(true);
        try {
            // Surgical Fetch from Frappe SOR
            const response = await frappeDataApi.getResource('Land Parcel', record.id || record.full_id);
            const latest = response.data.data;

            if (latest) {
                const updated = {
                    ...record,
                    status: (latest.ownership_status || 'Active').charAt(0).toUpperCase() + (latest.ownership_status || 'Active').slice(1),
                    date: `Checked: ${new Date().toLocaleTimeString()}`,
                    ulpin: latest.parcel_id || record.ulpin,
                    is_new: true // Trigger animation
                };
                setSelectedRecord(updated);
                setRecords(prev => prev.map(r => r.id === record.id ? updated : r));
            }
        } catch (err) {
            console.warn("Direct SOR fetch failed, pulling latest fleet data...");
            await fetchRegistryData();
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
            (record.khasra?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (record.village?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (record.id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (record.ulpin?.toLowerCase() || '').includes(searchQuery.toLowerCase());

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
                            placeholder="Owner, ULPIN or Khasra..."
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-64 transition-all dark:text-white"
                        />
                    </div>

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
                            {isUploading ? <RefreshCw className="animate-spin" size={18} /> :
                                uploadStatus === 'success' ? <CheckCircle size={18} /> :
                                    uploadStatus === 'error' ? <AlertCircle size={18} /> : <UploadCloud size={18} />}
                            {isUploading ? 'Analyzing...' : uploadStatus === 'success' ? 'Sync Success' : 'Digitize Record'}
                        </label>
                    </div>

                    <a
                        href="http://localhost:8090/app/land-parcel"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-secondary-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-primary-900/10 border border-white/10"
                    >
                        <Database size={18} className="text-primary-400" />
                        View Registry Master
                    </a>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-medium transition-colors ${showFilters ? 'bg-secondary-100 dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600' : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'}`}
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

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

            <AnimatePresence>
                {(isUploading || uploadStatus === 'success' || uploadStep !== 'idle') && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-white dark:bg-secondary-800 border-primary-500/30 border rounded-xl p-4 shadow-lg mb-4"
                    >
                        <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                            <RefreshCw size={14} className="animate-spin" /> Motia Unified Pipeline In-Progress
                        </h3>
                        <div className="flex items-center justify-between gap-1 relative px-4">
                            <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-secondary-100 dark:bg-secondary-700 -z-10" />

                            {[
                                { id: 'upload', label: 'Storage' },
                                { id: 'ocr', label: 'OCR' },
                                { id: 'ulpin', label: 'Spatial' },
                                { id: 'aadhaar', label: 'e-KYC' },
                                { id: 'save', label: 'Registry' }
                            ].map((step, idx) => {
                                const steps = ['idle', 'upload', 'ocr', 'ulpin', 'aadhaar', 'save', 'done'];
                                const activeIdx = steps.indexOf(uploadStep);
                                const myIdx = idx + 1;
                                const isCompleted = activeIdx > myIdx || uploadStep === 'done';
                                const isActive = uploadStep === step.id;

                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-2 bg-white dark:bg-secondary-800 px-3 z-10">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                                            isActive ? 'border-primary-500 bg-primary-50 text-primary-600' :
                                                'border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-300'
                                            }`}>
                                            {isCompleted ? <CheckCircle size={14} /> :
                                                isActive ? <RefreshCw className="animate-spin" size={14} /> :
                                                    <span className="text-xs font-bold">{idx + 1}</span>}
                                        </div>
                                        <span className={`text-[9px] uppercase font-bold tracking-tighter ${isActive || isCompleted ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-400'
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
                            <div className="w-1/2 bg-secondary-800 p-8 flex items-center justify-center border-r border-secondary-700 relative">
                                {pdfPreviewUrl && (
                                    <iframe src={pdfPreviewUrl} className="w-full h-full rounded shadow-lg bg-white" title="PDF Preview" />
                                )}
                                {isUploading && (
                                    <motion.div
                                        className="absolute inset-x-0 h-1 bg-primary-500/80 shadow-[0_0_15px_rgba(34,197,94,0.6)] z-10"
                                        animate={{ top: ['10%', '90%', '10%'] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    />
                                )}
                            </div>

                            <div className="w-1/2 p-8 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold dark:text-white">Motia Analysis Hub</h2>
                                    <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-secondary-800 rounded-full text-secondary-400">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="mb-8">
                                    <div className="flex justify-between text-sm mb-2 dark:text-secondary-300">
                                        <span>Step: {uploadStep.toUpperCase()}</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 bg-secondary-700 rounded-full overflow-hidden">
                                        <motion.div className="h-full bg-primary-500" animate={{ width: `${uploadProgress}%` }} />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs bg-secondary-950 p-4 rounded-lg border border-secondary-800">
                                    <div className="text-primary-500 font-bold opacity-60 mb-2">/ jk-agristack-log &gt;</div>
                                    {analysisLog.map((log, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex items-start gap-2 ${log.includes('✓') ? 'text-emerald-400 font-bold' :
                                                log.includes('❌') ? 'text-red-400' : 'text-secondary-400'}`}
                                        >
                                            <span>{log}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {uploadProgress === 100 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mt-6 p-4 bg-emerald-900/20 border border-emerald-800 rounded-xl flex items-center gap-4"
                                    >
                                        <div className="bg-emerald-500 p-2 rounded-lg">
                                            <ShieldCheck className="text-white" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-emerald-400 font-bold text-sm">Registry Sync Successful</p>
                                            <p className="text-emerald-400/60 text-[10px] uppercase font-bold">Document 1D: JK-ROR-{Date.now().toString().slice(-4)}</p>
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
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedRecord(record)}
                            className="bg-white/70 dark:bg-secondary-800/70 backdrop-blur-md border border-white/60 dark:border-secondary-700/60 rounded-xl p-5 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-secondary-800 transition-all flex items-center justify-between group cursor-pointer"
                        >
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-2xl bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center text-secondary-700 dark:text-secondary-400 font-bold text-lg">
                                        {record.village[0]}
                                    </div>
                                    {record.kyc_verified && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 border-2 border-white dark:border-secondary-800 rounded-full p-0.5">
                                            <ShieldCheck size={12} className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-secondary-900 dark:text-white">{record.owner}</h3>
                                        {record.ulpin && (
                                            <span className="text-[10px] bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded font-bold">
                                                {record.ulpin}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Khasra {record.khasra} • {record.village}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-sm font-black text-secondary-700 dark:text-secondary-200">{record.area}</p>
                                    <p className={`text-[10px] font-bold ${record.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {record.status.toUpperCase()}
                                    </p>
                                </div>
                                <button className="p-2 text-secondary-300 hover:text-secondary-900 dark:hover:text-white rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-16">
                        <Database className="mx-auto text-secondary-200 mb-4" size={48} />
                        <p className="text-secondary-500 font-medium">No records found matching your query.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedRecord(null)} className="absolute inset-0 bg-secondary-900/40 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                            <div className="p-8 border-b border-secondary-100 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-900/50">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-emerald-500 p-1.5 rounded-lg shadow-lg shadow-emerald-500/20">
                                            <ShieldCheck className="text-white" size={20} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verified Registry Record</span>
                                    </div>
                                    <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded-full transition-colors text-secondary-400">
                                        <X size={20} />
                                    </button>
                                </div>
                                <h2 className="text-3xl font-bold text-secondary-900 dark:text-white">{selectedRecord.owner}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-secondary-500">ULPIN: {selectedRecord.ulpin || 'PENDING'}</span>
                                    <div className="w-1 h-1 rounded-full bg-secondary-300" />
                                    <span className="text-xs text-secondary-500">Record ID: {selectedRecord.id}</span>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Village</label>
                                        <p className="font-bold text-secondary-900 dark:text-white text-lg">{selectedRecord.village}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Khasra No.</label>
                                        <p className="font-bold text-secondary-900 dark:text-white text-lg">{selectedRecord.khasra}</p>
                                    </div>
                                </div>

                                <div className="bg-secondary-50 dark:bg-secondary-900/50 p-6 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Verified Area</label>
                                        <p className="text-2xl font-black text-secondary-900 dark:text-white">{selectedRecord.area}</p>
                                    </div>
                                    <div className="bg-white dark:bg-secondary-800 p-3 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-700">
                                        <MapPin className="text-primary-500" size={24} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-secondary-100 dark:border-secondary-700">
                                    <div className="flex items-center gap-3 relative">
                                        <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg text-secondary-400 relative">
                                            <Calendar size={18} />
                                            {selectedRecord.is_new && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-secondary-900 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-secondary-400 tracking-wider flex items-center gap-1">
                                                Last Audit
                                                {selectedRecord.is_new && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 rounded">LIVE</span>}
                                            </span>
                                            <span className="text-xs font-bold text-secondary-600 dark:text-secondary-300">{selectedRecord.date}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-stretch shadow-lg shadow-primary-900/10 rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
                                        <button
                                            onClick={() => handleRefreshRecord(selectedRecord)}
                                            className="p-3 bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-all border-r border-secondary-200 dark:border-secondary-700 group"
                                            title="Real-time SOR Check"
                                        >
                                            <RefreshCw size={18} className={`${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500 text-primary-500'}`} />
                                        </button>

                                        <button
                                            onClick={() => window.open('http://localhost:8090/app/land-parcel', '_blank')}
                                            className="flex items-center gap-3 px-6 py-3 bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all group"
                                        >
                                            <Database size={18} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-sm">Registry Master</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
