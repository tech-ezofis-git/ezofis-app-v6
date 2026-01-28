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
            }, 40000);
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
        <div className="w-full h-[calc(100vh-110px)] p-4 lg:p-6 box-border overflow-hidden">
            <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-4 2xl:gap-6 h-full">

                {/* Left Column: File Preview */}
                <section className="col-span-8 flex flex-col h-full min-h-0">
                    <div className="flex-grow relative bg-[var(--gray-3)] rounded-xl overflow-hidden border border-[var(--gray-6)] shadow-inner flex justify-center items-center h-full">
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
                    </div>
                </section>

                {/* Right Column: Timeline */}
                <section className="col-span-4 flex flex-col h-full min-h-0">

                    <div className="bg-white border border-[var(--gray-3)] rounded-xl p-4 2xl:p-6 shadow-sm h-full flex flex-col overflow-hidden relative">

                        <div className="flex items-center justify-between mb-2 2xl:mb-4 shrink-0">
                            <h2 className="text-base 2xl:text-lg font-bold text-[var(--gray-12)]">Processing Timeline</h2>
                            {/* <span className="text-xs bg-[var(--primary-1)] text-[var(--primary-9)] px-3 py-1 rounded-full font-bold">LIVE</span> */}
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

                        {/* Insight / Alert Card */}
                        <div className={`rounded-xl p-3 2xl:p-4 mt-3 2xl:mt-6 text-white shadow-xl relative overflow-hidden group shrink-0 transition-all duration-500 ease-in-out ${showLongWaitMessage ? 'bg-[var(--blue-9)] shadow-[var(--blue-9)]/20' : 'bg-gradient-to-br from-[var(--primary-9)] to-[var(--violet-9)] shadow-[var(--primary-9)]/20'}`}>

                            {showLongWaitMessage ? (
                                // Long Wait Message View
                                <div className="animate-fade-in relative z-10">
                                    <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
                                        <Icon name="material-symbols:timer-rounded" className="text-6xl 2xl:text-8xl" />
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Icon name="material-symbols:info-rounded" className="text-xl 2xl:text-2xl shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-bold text-sm 2xl:text-base mb-1">Taking longer than usual</h3>
                                            <p className="text-xs 2xl:text-sm text-white/90 leading-relaxed">
                                                You can navigate away. The process will continue in the background. We'll notify you when it's done.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Normal Insight View
                                <div className="animate-fade-in">
                                    <div className="absolute -right-4 -top-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
                                        <Icon name="material-symbols:receipt-long" className="text-6xl 2xl:text-8xl" />
                                    </div>
                                    <h3 className="font-bold text-sm 2xl:text-base mb-1 2xl:mb-2 flex items-center">
                                        <Icon name="material-symbols:smart-toy" className="text-sm 2xl:text-md mr-2" />
                                        AP Agent Insight
                                    </h3>
                                    <p className="text-xs 2xl:text-sm text-white/80 leading-relaxed">
                                        The AP Agent is autonomously cross-referencing invoice line items with purchase orders to validate amounts.
                                    </p>
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