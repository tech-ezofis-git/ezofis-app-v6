import { useEffect, useState, useRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import BarLoader from '@/components/base/BarLoader'
import { Worker, Viewer, SpecialZoomLevel, type Plugin } from '@react-pdf-viewer/core';
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
    const [loadingTextIndex, setLoadingTextIndex] = useState(0)
    const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);

    // File Preview State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);

    // Viewer State
    // // const [scale, setScale] = useState(1);
    // const [currentPage, setCurrentPage] = useState(0);
    // const [totalPages, setTotalPages] = useState(0);
    const viewerRef = useRef<any>(null);

    const loadingPhrases = [
        "Extracting text layers",
        "Parsing document structure",
        "Identifying key-value pairs",
        "Normalizing character sets",
        "Analyzing spatial layout"
    ]

    // Custom Plugin to expose viewer methods
    const toolbarPlugin = (): Plugin => {
        return {
            install: (pluginFunctions) => {
                viewerRef.current = pluginFunctions;
            },
            // onDocumentLoad: (e) => {
            //     setTotalPages(e.doc.numPages);
            //     setCurrentPage(0);
            // },
            // onPageChange: (e) => {
            //     setCurrentPage(e.currentPage);
            // },
            // onZoom: (e: any) => {
            //     setScale(e.scale);
            // }
        };
    };

    // Memoize the plugin instance to prevent re-creation on render
    // However, since we need to capture the ref and it doesn't depend on props, we can just use a constant reference or create it once.
    // In React 18 strict mode, this might be called twice, but install will update the ref.
    const toolbarPluginInstance = useRef(toolbarPlugin()).current;

    // const handleZoomIn = () => {
    //     if (viewerRef.current) {
    //         viewerRef.current.zoom(scale + 0.1);
    //     }
    // };

    // const handleZoomOut = () => {
    //     if (viewerRef.current) {
    //         viewerRef.current.zoom(Math.max(0.1, scale - 0.1));
    //     }
    // };

    // const handlePrevPage = () => {
    //     if (viewerRef.current && currentPage > 0) {
    //         viewerRef.current.jumpToPage(currentPage - 1);
    //     }
    // };

    // const handleNextPage = () => {
    //     if (viewerRef.current && currentPage < totalPages - 1) {
    //         viewerRef.current.jumpToPage(currentPage + 1);
    //     }
    // };

    // Fetch File Data from API
    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setFileType(file.type)
            return () => URL.revokeObjectURL(url)
        }
        const fetchFile = async () => {
            if (fileId && repositoryId) {
                // Hardcoded parameters
                const tId = 2;
                const uId = "2";
                const type = 1; // 2 for file

                try {
                    const response = await fileApi.viewBinary(tId, uId, repositoryId, fileId, type);

                    if (response?.file) {
                        const base64 = response.file;
                        let mimeType = 'application/pdf'; // Default fallback

                        // Simple signature detection
                        if (base64.startsWith('/9j/')) mimeType = 'image/jpeg';
                        else if (base64.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
                        else if (base64.startsWith('JVBERi0')) mimeType = 'application/pdf';

                        const url = `data:${base64}`;
                        setPreviewUrl(url);
                        setFileType(mimeType);
                    }
                } catch (error) {
                    console.error("Error fetching file:", error);
                }
            }
        };

        fetchFile();
    }, [fileId, repositoryId, file]);

    useEffect(() => {
        const interval = setInterval(() => {
            setLoadingTextIndex((prev) => {
                if (prev >= loadingPhrases.length - 1) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            })
        }, 2000)
        return () => clearInterval(interval)
    }, [])

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
        if (lower === 'verifier' || lower === 'approved' || lower === 'completed') return 3;
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

            const timer = setTimeout(() => {
                setStep((prev) => prev + 1);
            }, delay);
            return () => clearTimeout(timer);
        } else if (step === 3 && targetStep === 3) {
            const timer = setTimeout(() => {
                onComplete();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [step, targetStep, onComplete, uploadStatus]);

    useEffect(() => {
        if (showLongWaitMessage && onRedirect) {
            const timer = setTimeout(() => {
                onRedirect();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showLongWaitMessage, onRedirect]);

    return (
        <div className="w-full h-[calc(100vh-110px)] p-4 lg:p-6 box-border overflow-hidden">
            <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-4 2xl:gap-6 h-full">

                {/* Left Column: File Preview */}
                <section className="col-span-8 flex flex-col h-full min-h-0 relative group">
                    <div className="flex-grow relative bg-[var(--gray-3)] rounded-xl overflow-hidden border border-[var(--gray-6)] shadow-inner flex justify-center items-center h-full">
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

                        {/* Floating Toolbar */}
                        {/* {previewUrl && fileType === 'application/pdf' && (
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-[var(--gray-4)] shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={handleZoomOut}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] transition-colors"
                                    title="Zoom Out"
                                >
                                    <Icon name="material-symbols:remove" className="text-lg" />
                                </button>
                                <span className="text-sm font-medium text-[var(--gray-12)] min-w-[3rem] text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] transition-colors"
                                    title="Zoom In"
                                >
                                    <Icon name="material-symbols:add" className="text-lg" />
                                </button>
                                <div className="w-px h-4 bg-[var(--gray-5)] mx-1" />
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 0}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] disabled:opacity-50 transition-colors"
                                    title="Previous Page"
                                >
                                    <Icon name="material-symbols:chevron-left" className="text-lg" />
                                </button>
                                <span className="text-sm font-medium text-[var(--gray-12)]">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages - 1}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] disabled:opacity-50 transition-colors"
                                    title="Next Page"
                                >
                                    <Icon name="material-symbols:chevron-right" className="text-lg" />
                                </button>
                            </div>
                        )} */}

                        {/* Scanner effect wrapper - Visible during processing (steps 0, 1, 2) */}
                        {previewUrl && step < 3 && (
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
                        </div>

                        {/* Use flex-1 and justify-between to distribute space evenly so it fits without scroll */}
                        <div className="flex-1 flex flex-col justify-between relative pl-1 min-h-0 py-1 2xl:py-2">
                            {/* Vertical Line - Absolute across the flex container */}
                            <div className="absolute left-[1.15rem] 2xl:left-6 top-3 2xl:top-4 bottom-3 2xl:bottom-4 w-0.5 bg-[var(--gray-3)] -z-0">
                                <div
                                    className="absolute top-0 left-0 w-full bg-[var(--primary-9)] transition-all duration-1000 ease-linear"
                                    style={{ height: `${(step / 3) * 100}%` }}
                                ></div>
                            </div>

                            {/* Step 1: Upload */}
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
                                    <p className={`font-bold text-sm 2xl:text-base transition-colors duration-300 ${uploadStatus === 'success' ? 'text-[var(--green-11)]' :
                                        uploadStatus === 'error' ? 'text-[var(--red-11)]' : 'text-[var(--primary-11)]'
                                        }`}>
                                        {uploadStatus === 'success' ? 'File uploaded successfully' :
                                            uploadStatus === 'error' ? 'Upload failed' : 'Uploading file...'}
                                    </p>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-10)] mt-0.5 2xl:mt-1">{file?.name} {uploadStatus === 'success' && '(Verified)'}</p>
                                    {uploadStatus === 'error' && (
                                        <p className="text-[10px] 2xl:text-xs text-[var(--red-9)] mt-0.5 2xl:mt-1">Please try again.</p>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Extraction */}
                            <div className={`relative flex items-start space-x-4 2xl:space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 1 ? (step > 1 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-[var(--primary-9)] shadow-[var(--primary-9)]/30') : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step > 1 ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        step === 1 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-base 2xl:text-lg animate-spin" /> : <div className="w-2 2xl:w-2.5 h-2 2xl:h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1 w-full">
                                    <p className={`font-bold text-sm 2xl:text-base flex items-center transition-colors duration-300 ${step === 1 ? 'text-[var(--primary-9)]' : (step > 1 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]')}`}>
                                        Extracting data
                                        {step === 1 && (
                                            <span className="ml-1 flex space-x-1 mt-1.5">
                                                <span className="w-1 h-1 bg-[var(--primary-9)] rounded-full animate-bounce"></span>
                                                <span className="w-1 h-1 bg-[var(--primary-9)] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                <span className="w-1 h-1 bg-[var(--primary-9)] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                            </span>
                                        )}
                                    </p>
                                    {step === 1 && (
                                        <div className="mt-1 2xl:mt-2 animate-fade-in-up">
                                            <div className="flex items-center gap-2 2xl:gap-3">
                                                <div className="flex h-6 w-6 2xl:h-8 2xl:w-8 items-center justify-center rounded-full">
                                                    <BarLoader />
                                                </div>
                                                <div className="flex-1">
                                                    <p key={loadingTextIndex} className="text-xs 2xl:text-sm font-medium text-[var(--gray-11)] animate-fade-in">
                                                        {loadingPhrases[loadingTextIndex]}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {step != 0 && step != 1 && (<p className="text-xs 2xl:text-sm font-medium text-[var(--gray-11)] animate-fade-in">
                                        Extracted Successfully
                                    </p>)}
                                </div>
                            </div>

                            {/* Step 3: Matching */}
                            <div className={`relative flex items-start space-x-4 2xl:space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 2 ? (step > 2 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-[var(--primary-9)] shadow-[var(--primary-9)]/30') : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step > 2 ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        step === 2 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-base 2xl:text-lg animate-spin" /> : <div className="w-2 2xl:w-2.5 h-2 2xl:h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1">
                                    <p className={`font-bold text-sm 2xl:text-base transition-colors duration-300 ${step === 2 ? 'text-[var(--primary-9)]' : (step > 2 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]')}`}>Matching PO details...</p>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-9)] mt-0.5 2xl:mt-1">Cross-referencing with ERP records.</p>
                                </div>
                            </div>

                            {/* Step 4: Policy */}
                            <div className={`relative flex items-start space-x-4 2xl:space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-7 h-7 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 3 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step >= 3 ? (
                                        <Icon name="material-symbols:check" className="text-white text-base 2xl:text-lg" />
                                    ) : (
                                        <div className="w-2 2xl:w-2.5 h-2 2xl:h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-0.5 2xl:pt-1">
                                    <p className={`font-bold text-sm 2xl:text-base transition-colors duration-300 ${step === 3 ? 'text-[var(--green-11)]' : 'text-[var(--gray-10)]'}`}>Policy Compliance Check</p>
                                    <p className="text-xs 2xl:text-sm text-[var(--gray-9)] mt-0.5 2xl:mt-1">Validating against guidelines.</p>
                                </div>
                            </div>
                        </div>

                        {/* Long Wait Alert Link - Replacing Insight Card */}
                        {showLongWaitMessage && (
                            <div className="rounded-xl p-3 2xl:p-4 mt-3 2xl:mt-6 bg-[var(--amber-9)] text-white shadow-xl relative overflow-hidden group shrink-0 transition-all duration-500 ease-in-out animate-fade-in">
                                <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
                                    <Icon name="material-symbols:timer-rounded" className="text-6xl 2xl:text-8xl" />
                                </div>
                                <div className="flex items-start gap-3">
                                    <Icon name="material-symbols:warning-rounded" className="text-xl 2xl:text-2xl shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-sm 2xl:text-base mb-1">Taking longer than usual</h3>
                                        <p className="text-xs 2xl:text-sm text-white/90 leading-relaxed">
                                            Redirecting you to the inbox. The process will continue in the background.
                                        </p>
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-white/30 mt-3 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white transition-all duration-[5000ms] ease-linear"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </section>
            </div>
        </div>
    )
}

export default ProcessingScreen