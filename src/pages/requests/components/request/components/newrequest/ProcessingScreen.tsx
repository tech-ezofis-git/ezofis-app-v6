import { useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import BarLoader from '@/components/base/BarLoader'

interface ProcessingScreenProps {
    file: File | null
    stage: string
    uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
    onComplete: () => void
}

const ProcessingScreen = ({ file, stage, uploadStatus, onComplete }: ProcessingScreenProps) => {
    const [step, setStep] = useState(0)
    const [fileUrl, setFileUrl] = useState<string | null>(null)
    const [loadingTextIndex, setLoadingTextIndex] = useState(0)
    const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);
    // const [dotCount, setDotCount] = useState(0);

    const loadingPhrases = [
        "Extracting text layers",
        "Parsing document structure",
        "Identifying key-value pairs",
        "Normalizing character sets",
        "Analyzing spatial layout"
    ]

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file)
            setFileUrl(url)
            return () => URL.revokeObjectURL(url)
        }
    }, [file])

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

    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         setDotCount((prev) => (prev + 1) % 4);
    //     }, 500);
    //     return () => clearInterval(interval);
    // }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        // Check if step is 1 (Extraction)
        if (step === 1) {
            timer = setTimeout(() => {
                setShowLongWaitMessage(true);
            }, 180000); // 3 minutes
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

    // Handle closing the alert automatically or manually isn't needed if we move it to the insight card

    return (
        <div className="w-full h-[calc(100vh-110px)] p-6 box-border overflow-hidden">
            <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6 h-full">

                {/* Left Column: File Preview */}
                <section className="col-span-8 flex flex-col h-full min-h-0">
                    <div className="flex-grow relative bg-[var(--gray-3)] rounded-xl overflow-hidden border border-[var(--gray-6)] shadow-inner flex justify-center items-center h-full">
                        {/* Blur overlay container - This blurs whatever is behind it if we used backdrop-filter, 
                            but here we want the container itself to look distinct or the content inside.
                            The user asked to "fill the viewer with the left container and mke the full container as blur the viewer container"
                            I will assume they want the image inside to be slightly blurred to show 'processing' state or just the container look.
                            Let's use a glass effect on the top layer.
                        */}

                        <div className="absolute inset-0 z-0">
                            {file?.type === 'application/pdf' ? (
                                fileUrl ? (
                                    <iframe
                                        src={`${fileUrl}#view=FitH`}
                                        className="w-full h-full border-none opacity-50 blur-[2px]"
                                        title="PDF Preview"
                                    />
                                ) : null
                            ) : (
                                <img src={fileUrl || ''} alt="Preview" className="w-full h-full object-contain opacity-60 blur-sm scale-105" />
                            )}
                        </div>

                        {/* Scanning effect wrapper */}
                        <div className="absolute inset-0 z-10 backdrop-blur-[1px] bg-white/10"></div>
                        <div className="absolute inset-x-0 h-1 scanning-bar animate-scan z-20 pointer-events-none shadow-[0_0_15px_rgba(var(--primary-9),0.5)]"></div>

                        {/* Center Logo or indicator suitable for processing state */}
                        {/* <div className="z-30 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/50 flex flex-col items-center animate-pulse-slow">
                            <Icon name="material-symbols:document-scanner-rounded" className="text-6xl text-[var(--primary-9)] mb-3" />
                            <p className="text-[var(--gray-11)] font-medium">Processing Document...</p>
                        </div> */}
                    </div>
                </section>

                {/* Right Column: Timeline */}
                <section className="col-span-4 flex flex-col h-full min-h-0">

                    <div className="bg-white border border-[var(--gray-3)] rounded-xl p-6 shadow-sm h-full flex flex-col overflow-hidden relative">

                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h2 className="text-lg font-bold text-[var(--gray-12)]">Processing Timeline</h2>
                            {/* <span className="text-xs bg-[var(--primary-1)] text-[var(--primary-9)] px-3 py-1 rounded-full font-bold">LIVE</span> */}
                        </div>

                        {/* Use flex-1 and justify-between to distribute space evenly so it fits without scroll */}
                        <div className="flex-1 flex flex-col justify-between relative pl-2 min-h-0 py-2">
                            {/* Vertical Line - Absolute across the flex container */}
                            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-[var(--gray-3)] -z-0">
                                <div
                                    className="absolute top-0 left-0 w-full bg-[var(--primary-9)] transition-all duration-1000 ease-linear"
                                    style={{ height: `${(step / 3) * 100}%` }}
                                ></div>
                            </div>

                            {/* Step 1: Upload */}
                            <div className="relative flex items-start space-x-6 z-10">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${uploadStatus === 'success' ? 'bg-[var(--green-9)]' :
                                    uploadStatus === 'error' ? 'bg-[var(--red-9)]' : 'bg-[var(--primary-9)]'
                                    }`}>
                                    {uploadStatus === 'success' ? (
                                        <Icon name="material-symbols:check" className="text-white text-lg" />
                                    ) : uploadStatus === 'error' ? (
                                        <Icon name="material-symbols:error-outline" className="text-white text-lg" />
                                    ) : (
                                        <Icon name="tabler:rotate-clockwise-2" className="text-white text-lg animate-spin" />
                                    )}
                                </div>
                                <div className="pt-1">
                                    <p className={`font-bold transition-colors duration-300 ${uploadStatus === 'success' ? 'text-[var(--green-11)]' :
                                        uploadStatus === 'error' ? 'text-[var(--red-11)]' : 'text-[var(--primary-11)]'
                                        }`}>
                                        {uploadStatus === 'success' ? 'File uploaded successfully' :
                                            uploadStatus === 'error' ? 'Upload failed' : 'Uploading file...'}
                                    </p>
                                    <p className="text-sm text-[var(--gray-10)] mt-1">{file?.name} {uploadStatus === 'success' && '(Verified)'}</p>
                                    {uploadStatus === 'error' && (
                                        <p className="text-xs text-[var(--red-9)] mt-1">Please try again.</p>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Extraction */}
                            <div className={`relative flex items-start space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 1 ? (step > 1 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-[var(--primary-9)] shadow-[var(--primary-9)]/30') : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step > 1 ? (
                                        <Icon name="material-symbols:check" className="text-white text-lg" />
                                    ) : (
                                        step === 1 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-lg animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-1 w-full">
                                    <p className={`font-bold flex items-center transition-colors duration-300 ${step === 1 ? 'text-[var(--primary-9)]' : (step > 1 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]')}`}>
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
                                        <div className="mt-2 animate-fade-in-up">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full">
                                                    <BarLoader />
                                                </div>
                                                <div className="flex-1">
                                                    <p key={loadingTextIndex} className="text-sm font-medium text-[var(--gray-11)] animate-fade-in">
                                                        {loadingPhrases[loadingTextIndex]}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {step != 0 && step != 1 && (<p className="text-sm font-medium text-[var(--gray-11)] animate-fade-in">
                                        Extracted Successfully
                                    </p>)}
                                </div>
                            </div>

                            {/* Step 3: Matching */}
                            <div className={`relative flex items-start space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 2 ? (step > 2 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-[var(--primary-9)] shadow-[var(--primary-9)]/30') : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step > 2 ? (
                                        <Icon name="material-symbols:check" className="text-white text-lg" />
                                    ) : (
                                        step === 2 ? <Icon name="tabler:rotate-clockwise-2" className="text-white text-lg animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-1">
                                    <p className={`font-bold transition-colors duration-300 ${step === 2 ? 'text-[var(--primary-9)]' : (step > 2 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]')}`}>Matching PO details...</p>
                                    <p className="text-sm text-[var(--gray-9)] mt-1">Cross-referencing with ERP records.</p>
                                </div>
                            </div>

                            {/* Step 4: Policy */}
                            <div className={`relative flex items-start space-x-6 z-10 transition-opacity duration-300 opacity-100`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-300 ${step >= 3 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-white border-2 border-[var(--gray-4)]'}`}>
                                    {step >= 3 ? (
                                        <Icon name="material-symbols:check" className="text-white text-lg" />
                                    ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--gray-4)]" />
                                    )}
                                </div>
                                <div className="pt-1">
                                    <p className={`font-bold transition-colors duration-300 ${step === 3 ? 'text-[var(--green-11)]' : 'text-[var(--gray-10)]'}`}>Policy Compliance Check</p>
                                    <p className="text-sm text-[var(--gray-9)] mt-1">Validating against guidelines.</p>
                                </div>
                            </div>
                        </div>

                        {/* Insight / Alert Card */}
                        {showLongWaitMessage && (
                            <div className="absolute bottom-6 right-6 z-50 animate-fade-in-up">
                                <div className="bg-[var(--primary-9)] text-white p-4 rounded-lg shadow-lg max-w-sm relative pr-10">
                                    <button
                                        onClick={() => setShowLongWaitMessage(false)}
                                        className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
                                    >
                                        <Icon name="material-symbols:close" className="text-xl" />
                                    </button>
                                    <h4 className="font-bold mb-1 flex items-center gap-2">
                                        <Icon name="material-symbols:info-outline" className="text-lg" />
                                        Taking longer than usual
                                    </h4>
                                    <p className="text-sm text-white/90 leading-relaxed">
                                        You can go back and do other activities. The process will continue in the background.
                                    </p>
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