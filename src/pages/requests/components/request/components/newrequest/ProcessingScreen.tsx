import { useEffect, useState, useRef, useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import BarLoader from '@/components/base/BarLoader'
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import fileApi from '@/api/file/file';

interface ProcessingScreenProps {
    file: File | null
    stage: string
    uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
    onComplete: () => void
    onRedirect?: () => void
    fileId: number | null
    repositoryId: number | null
}

const ProcessingScreen = ({ file, stage, uploadStatus, onComplete, onRedirect, fileId, repositoryId }: ProcessingScreenProps) => {
    const [step, setStep] = useState(0)
    const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);

    // File Preview State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [scale, setScale] = useState(1);
    const viewerRef = useRef<any>(null);

    const [elapsedTimes, setElapsedTimes] = useState<Record<number, number>>({});
    const [currentTimer, setCurrentTimer] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTimer(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [step]);

    useEffect(() => {
        if (step > 0) {
            setElapsedTimes(prev => ({ ...prev, [step - 1]: currentTimer }));
        }
        setCurrentTimer(0);
    }, [step]);


    const toolbarPluginInstance = useMemo(() => ({
        install: (pluginFunctions: any) => {
            viewerRef.current = pluginFunctions;
        },
        onZoom: (e: any) => {
            setScale(e.scale);
        }
    }), []);

    // Fetch File Data from API
    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setFileType(file.type)
            return () => URL.revokeObjectURL(url)
        }
        const fetchFile = async () => {
            const rId = Number(repositoryId);
            if (fileId && !isNaN(rId) && rId > 0) {
                // Hardcoded parameters
                const tId = 2; // Keep hardcoded if that's what was here, or use dynamic if available
                const uId = "2";
                const type = 2; // Original file

                try {
                    const response = await fileApi.viewBinary(tId, uId, rId, fileId, type);

                    if (response?.data) {
                        const base64 = response.data.file || response.data;
                        if (typeof base64 !== 'string') return;

                        let mimeType = 'application/pdf'; // Default fallback

                        // Simple signature detection
                        if (base64.startsWith('/9j/')) mimeType = 'image/jpeg';
                        else if (base64.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
                        else if (base64.startsWith('JVBERi0')) mimeType = 'application/pdf';

                        const url = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
                        setPreviewUrl(url);
                        setFileType(mimeType);
                    }
                } catch (error) {
                    console.error("Error fetching file:", error);
                }
            }
        };

        fetchFile();
    }, [fileId, repositoryId, file, refreshCounter]);


    const [totalTime, setTotalTime] = useState(0);
    const [keywordIndex, setKeywordIndex] = useState(0);

    const loadingPhrases = [
        'Analyzing spatial layout',
        'Extracting textual metadata',
        'Recognizing table structures',
        'Mapping semantic entities',
        'Validating data consistency'
    ];

    // Keyword loop timer - slower pace (10s)
    useEffect(() => {
        const timer = setInterval(() => {
            setKeywordIndex((prev) => (prev + 1) % 5);
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}.${secs < 10 ? '0' : ''}${secs}m`;
    };

    // Total time tracker
    useEffect(() => {
        if (uploadStatus === 'error' || step > 4) return;
        
        const timer = setInterval(() => {
            setTotalTime((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [uploadStatus, step]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        // Check if step is 1 (Extraction)
        if (step === 1) {
            timer = setTimeout(() => {
                setShowLongWaitMessage(true);
            }, 40000); // 40s wait
        } else {
            setShowLongWaitMessage(false);
        }
        return () => clearTimeout(timer);
    }, [step]);

    const getTargetStep = (s: string) => {
        const lower = s.toLowerCase();
        if (lower === 'verifier' || lower === 'approved' || lower === 'completed') return 4;
        if (lower === 'ap agent' || lower.includes('matching')) return 2;
        if (lower === 'start' || lower.includes('extract')) return 1;
        return 0;
    };

    const targetStep = getTargetStep(stage);

    useEffect(() => {
        if (uploadStatus === 'uploading' || uploadStatus === 'error') return;

        if (step < targetStep) {
            let delay = 1500;
            if (step === 2) delay = 10000;
            if (step === 3) delay = 3000;

            const timer = setTimeout(() => {
                setStep((prev) => prev + 1);
            }, delay);
            return () => clearTimeout(timer);
        } else if (step === 4 && targetStep === 4) {
            const timer = setTimeout(() => {
                onComplete();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [step, targetStep, onComplete, uploadStatus]);

    return (
        <div className="w-full h-[calc(100vh-110px)] p-4 lg:p-6 box-border overflow-hidden">
            <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-4 2xl:gap-6 h-full">

                {/* Left Column: File Preview */}
                <section className="col-span-8 flex flex-col h-full min-h-0 bg-white rounded-xl border border-[var(--gray-3)] overflow-hidden shadow-sm group relative">
                    {/* Document Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--gray-2)] bg-white shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[var(--indigo-2)] flex items-center justify-center text-[var(--indigo-9)] shrink-0">
                                <Icon name="lucide:file-text" className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="text-[13px] font-bold text-[var(--gray-13)] leading-none mb-1">Document Preview</h3>
                                <p className="text-[11px] text-[var(--gray-10)] font-medium truncate">
                                    {file?.name || 'Loading document...'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-[var(--gray-2)] px-2.5 py-1 rounded-md border border-[var(--gray-3)]">
                                <button 
                                    onClick={() => viewerRef.current?.zoom(scale - 0.1)}
                                    className="text-[var(--gray-11)] hover:text-[var(--primary-9)] transition-colors active:scale-90"
                                >
                                    <Icon name="lucide:zoom-out" className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-bold text-[var(--gray-13)] min-w-[30px] text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button 
                                    onClick={() => viewerRef.current?.zoom(scale + 0.1)}
                                    className="text-[var(--gray-11)] hover:text-[var(--primary-9)] transition-colors active:scale-90"
                                >
                                    <Icon name="lucide:zoom-in" className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <div className="w-px h-5 bg-[var(--gray-3)]" />
                            
                            <button 
                                onClick={() => {
                                    setPreviewUrl(null);
                                    setRefreshCounter(prev => prev + 1);
                                    setKeywordIndex(0);
                                }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--primary-9)] hover:bg-[var(--primary-2)] transition-all active:rotate-180 duration-500"
                                title="Refresh Preview"
                            >
                                <Icon name="lucide:refresh-cw" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Viewer Area */}
                    <div className="flex-grow relative bg-[var(--gray-3)] overflow-hidden shadow-inner flex justify-center items-center h-full">
                        <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
                            {previewUrl ? (
                                fileType === 'application/pdf' ? (
                                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                                        <div className="h-full w-full overflow-hidden relative">
                                            <Viewer
                                                fileUrl={previewUrl}
                                                defaultScale={SpecialZoomLevel.PageFit}
                                                plugins={[toolbarPluginInstance]}
                                            />
                                        </div>
                                    </Worker>
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Document Preview"
                                        className="w-full h-full object-contain"
                                    />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--gray-8)]">
                                    <BarLoader />
                                    <p className="mt-4 text-sm font-medium">Loading document...</p>
                                </div>
                            )}
                        </div>

                        {/* Scanner effect wrapper - Visible during processing (steps 0, 1, 2, 3) */}
                        {previewUrl && step < 4 && (
                            <div className="absolute inset-0 z-10 pointer-events-none">
                                <div className="absolute inset-0 bg-[var(--primary-9)]/5"></div>
                                <div className="absolute inset-x-0 h-1 scanning-bar animate-scan z-20 shadow-[0_0_15px_rgba(var(--primary-9),0.8)] bg-[var(--primary-9)]"></div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Column: Timeline */}
                <section className="col-span-4 flex flex-col h-full min-h-0">

                    <div className="bg-white border border-[var(--gray-3)] rounded-xl p-4 2xl:p-6 shadow-sm h-full flex flex-col overflow-hidden relative">

                        <div className="flex items-center justify-between mb-2 2xl:mb-4 shrink-0">
                            <h2 className="text-base 2xl:text-lg font-bold text-[var(--gray-12)]">Processing Timeline</h2>
                            
                            <div className="flex items-center gap-2 px-2.5 py-1 bg-[var(--gray-2)] rounded-lg border border-[var(--gray-3)] shadow-sm">
                                <Icon 
                                    name="material-symbols:auto-awesome-rounded" 
                                    className={`w-3.5 h-3.5 ${step <= 4 ? 'animate-spin text-[var(--orange-9)]' : 'text-[var(--gray-11)]'}`} 
                                />
                                <span className={`text-[11px] 2xl:text-xs font-black ${step <= 4 ? 'text-[var(--orange-9)]' : 'text-[var(--gray-12)]'}`}>
                                    {formatTime(totalTime)}
                                </span>
                            </div>
                        </div>

                        {/* Tighter spacing using gap-8 instead of justify-between */}
                        <div className="flex-1 flex flex-col justify-between relative pl-1 min-h-0 py-2 2xl:py-4 overflow-y-auto custom-scrollbar">
                            {/* Vertical Line */}
                            <div className="absolute left-[1.15rem] 2xl:left-6 top-3 2xl:top-4 bottom-3 2xl:bottom-4 w-0.5 bg-[var(--gray-3)] -z-0">
                                <div
                                    className="absolute top-0 left-0 w-full bg-[var(--primary-9)] transition-all duration-1000 ease-linear"
                                    style={{ height: `${(step / 4) * 100}%` }}
                                ></div>
                            </div>

                            {/* Step 0: Upload */}
                            <div className="relative flex items-start space-x-4 2xl:space-x-6 z-10">
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${uploadStatus === 'success' ? 'bg-[var(--green-9)]' :
                                    uploadStatus === 'error' ? 'bg-[var(--red-9)]' : 'bg-[var(--primary-9)]'
                                    }`}>
                                    {uploadStatus === 'success' ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : uploadStatus === 'error' ? (
                                        <Icon name="material-symbols:error-outline" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        <Icon name="tabler:rotate-clockwise-2" className="text-white text-base 2xl:text-lg animate-spin" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-medium text-sm 2xl:text-base transition-colors duration-300 ${uploadStatus === 'success' ? 'text-[var(--green-11)]' :
                                            uploadStatus === 'error' ? 'text-[var(--red-11)]' : 'text-[var(--primary-11)]'
                                            }`}>
                                            {uploadStatus === 'success' ? 'File uploaded successfully' :
                                                uploadStatus === 'error' ? 'Upload failed' : 'Uploading file...'}
                                        </p>
                                        {step === 0 && (
                                            <div className="flex items-center gap-1 text-[var(--orange-9)] animate-pulse">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(currentTimer)}
                                                </span>
                                            </div>
                                        )}
                                        {step > 0 && elapsedTimes[0] !== undefined && (
                                            <div className="flex items-center gap-1 text-[var(--green-11)]">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(elapsedTimes[0])}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-10)] mt-0.5">
                                        {uploadStatus === 'success' ? file?.name : 'Initializing upload...'}
                                    </p>
                                </div>
                            </div>

                            {/* Step 1: Extraction */}
                            <div className={`relative flex items-start space-x-4 2xl:space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 1 ? (step > 1 ? 'bg-[var(--green-9)]' : 'bg-[var(--primary-9)]') : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step > 1 ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        step === 1 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-base 2xl:text-lg animate-spin" /> : <div className="w-2 2xl:w-2.5 h-2 2xl:h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1 w-full">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-medium text-sm 2xl:text-base flex items-center transition-colors duration-300 ${step === 1 ? 'text-[var(--primary-9)]' : (step > 1 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]')}`}>
                                            Extracting data
                                        </p>
                                        {step === 1 && (
                                            <div className="flex items-center gap-1 text-[var(--orange-9)] animate-pulse">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(currentTimer)}
                                                </span>
                                            </div>
                                        )}
                                        {step > 1 && elapsedTimes[1] !== undefined && (
                                            <div className="flex items-center gap-1 text-[var(--green-11)]">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(elapsedTimes[1])}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-9)] mt-0.5">
                                        {step > 1 ? 'Data extraction complete' : ''}
                                    </p>
                                    {step === 1 && (
                                        <div className="mt-2 animate-fade-in-up">
                                            <div className="flex items-center gap-2 2xl:gap-3">
                                                <BarLoader />
                                                <p key={keywordIndex} className="text-[11px] 2xl:text-xs font-medium text-[var(--gray-11)] animate-fade-in">
                                                    {loadingPhrases[keywordIndex]}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Matching */}
                            <div className={`relative flex items-start space-x-4 2xl:space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 2 ? (step > 2 ? 'bg-[var(--green-9)]' : 'bg-[var(--primary-9)]') : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step > 2 ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        step === 2 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-base 2xl:text-lg animate-spin" /> : <div className="w-2 2xl:w-2.5 h-2 2xl:h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-medium text-sm 2xl:text-base transition-colors duration-300 ${step === 2 ? 'text-[var(--primary-9)]' : (step > 2 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]')}`}>Matching PO details...</p>
                                        {step === 2 && (
                                            <div className="flex items-center gap-1 text-[var(--orange-9)] animate-pulse">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(currentTimer)}
                                                </span>
                                            </div>
                                        )}
                                        {step > 2 && elapsedTimes[2] !== undefined && (
                                            <div className="flex items-center gap-1 text-[var(--green-11)]">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(elapsedTimes[2])}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-9)] mt-0.5">
                                        {step > 2 ? 'Records matched successfully' : 'Cross-referencing records'}
                                    </p>
                                </div>
                            </div>

                            {/* Step 3: Policy */}
                            <div className={`relative flex items-start space-x-4 2xl:space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 3 ? (step > 3 ? 'bg-[var(--green-9)]' : 'bg-[var(--primary-9)]') : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step > 3 ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        step === 3 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-base 2xl:text-lg animate-spin" /> : <div className="w-2 2xl:w-2.5 h-2 2xl:h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-medium text-sm 2xl:text-base transition-colors duration-300 ${step === 3 ? 'text-[var(--primary-9)]' : (step > 3 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]')}`}>Policy Compliance</p>
                                        {step === 3 && (
                                            <div className="flex items-center gap-1 text-[var(--orange-9)] animate-pulse">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(currentTimer)}
                                                </span>
                                            </div>
                                        )}
                                        {step > 3 && elapsedTimes[3] !== undefined && (
                                            <div className="flex items-center gap-1 text-[var(--green-11)]">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(elapsedTimes[3])}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-9)] mt-0.5">
                                        {step > 3 ? 'Guidelines validated' : 'Validating guidelines'}
                                    </p>
                                </div>
                            </div>

                            {/* Step 4: AP Agent Decision */}
                            <div className={`relative flex items-start space-x-4 2xl:space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 4 ? 'bg-[var(--green-9)]' : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step >= 4 ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        step === 4 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-base 2xl:text-lg animate-spin" /> : <div className="w-2 2xl:w-2.5 h-2 2xl:h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-medium text-sm 2xl:text-base transition-colors duration-300 ${step === 4 ? 'text-[var(--primary-9)]' : (step > 4 ? 'text-[var(--green-11)]' : 'text-[var(--gray-10)]')}`}>AP Agent Decision</p>
                                        {step === 4 && (
                                            <div className="flex items-center gap-1 text-[var(--orange-9)] animate-pulse">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(currentTimer)}
                                                </span>
                                            </div>
                                        )}
                                        {step > 4 && elapsedTimes[4] !== undefined && (
                                            <div className="flex items-center gap-1 text-[var(--green-11)]">
                                                <Icon name="lucide:timer" className="w-3 h-3" />
                                                <span className="text-[10px] 2xl:text-xs font-bold">
                                                    {formatTime(elapsedTimes[4])}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-9)] mt-0.5">
                                        {step > 4 ? 'Final decision determined' : 'Analyzing context & keywords'}
                                    </p>
                                </div>
                            </div>

                            {/* Long Wait Alert Link - Subtler message inside timeline */}
                            {showLongWaitMessage && (
                                <div className="rounded-xl p-3 mt-4 bg-[var(--blue-2)] border border-[var(--blue-4)] text-[var(--blue-11)] shadow-sm relative overflow-hidden animate-fade-in shrink-0">
                                    <div className="flex items-start gap-2.5">
                                        <Icon name="material-symbols:lightbulb-outline" className="text-lg shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Quick Hint</p>
                                            <p className="text-[10px] 2xl:text-[11px] font-medium leading-relaxed">
                                                This is taking a bit longer. You can safely navigate away; we'll notify you in the inbox once ready.
                                            </p>
                                            {onRedirect && (
                                                <button 
                                                    onClick={onRedirect}
                                                    className="mt-2 text-[10px] font-bold text-[var(--blue-11)] hover:underline cursor-pointer flex items-center gap-1"
                                                >
                                                    Go to Inbox
                                                    <Icon name="tabler:arrow-right" className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default ProcessingScreen