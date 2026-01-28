import { useEffect, useRef, useState } from 'react'
import Icon from '../../../../../../components/base/icon/Icon'
import { AnimateFadeIn, AnimateSlideUp, AnimateStagger } from '../../../../../../components/common/animations'
import { PDF_ACCEPT, isPdf, MAX_SIZE } from './utils'
import ProcessingScreen from './ProcessingScreen'
// import SummaryScreen from './SummaryScreen' // Replaced by Request
import Request from '../../Request'
// import { MOCK_INVOICE_DATA } from './mockData'
import showToast from '@/components/base/toast/showToast'
import folderApi from "@/api/folders/folders"
import workflowApi from "@/api/workflow/workflow"
import requestApi from "@/api/requests/requests"
import authUserStore from "@/stores/authUserStore"
import requestStore from "@/pages/requests/stores/useRequestStore"

const FileUpload = ({ onRequestCreated, onClose }: { onRequestCreated?: () => void, onClose?: () => void }) => {
    const rawWorkflow = requestStore((state) => state.rawWorkflowData);
    const workflowRefresh = requestStore((state) => state.workflowRefresh);

    const invoiceInputRef = useRef<HTMLInputElement>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    // const [isInvoiceUploading, setIsInvoiceUploading] = useState(false) // Removed unused state
    // const [uploadedInvoiceName, setUploadedInvoiceName] = useState<string | null>(null)

    // Flow State
    const [step, setStep] = useState<'upload' | 'processing' | 'summary'>('upload')
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

    // API State
    const [repoData, setRepoData] = useState<any>(null);
    const [fileId, setFileId] = useState<string | null>(null)
    const [fileData, setFileData] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Polling State
    const [pollingActive, setPollingActive] = useState(false);
    const [pollingProcessId, setPollingProcessId] = useState<Number | null>(null);
    const [currentStage, setCurrentStage] = useState<string>('Start');
    const [fetchedRequestData, setFetchedRequestData] = useState<any>(null);

    // Trigger creation when entering processing step and upload is complete
    useEffect(() => {
        if (step === 'processing' && uploadStatus === 'success' && !pollingActive && !pollingProcessId && !isSubmitting) {
            handleCreateRequest();
        }
    }, [step, uploadStatus]);

    useEffect(() => {
        handleFolderFetch();
    }, []);

    // ... (Polling Effect remains the same) ...
    // Polling Effect
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (pollingActive && pollingProcessId && rawWorkflow?.id) {
            const pollData = async () => {
                try {
                    console.log("Polling Process ID:", pollingProcessId);
                    const payload = {
                        itemsPerPage: 5,
                        currentPage: 1,
                        sortBy: { criteria: '', order: 'DESC' },
                        filterBy: []
                    };

                    console.log("Polling Payload:", payload);

                    const findItemInResponse = (data: any) => {
                        if (Array.isArray(data)) {
                            for (const group of data) {
                                if (group.items && Array.isArray(group.items)) {
                                    const found = group.items.find((i: any) => String(i.processId) === String(pollingProcessId));
                                    if (found) return found;
                                }
                                if (group.value && Array.isArray(group.value)) {
                                    const found = group.value.find((i: any) => String(i.processId) === String(pollingProcessId));
                                    if (found) return found;
                                }
                            }
                        } else if (data?.data && Array.isArray(data.data)) {
                            return data.data[0];
                        }
                        return null;
                    };

                    // Check Sent List
                    let response = await requestApi.getSentListById(rawWorkflow.id, payload);
                    console.log("Polling Response (SentList):", response);
                    let item = response?.data ? findItemInResponse(response.data) : null;

                    // Fallback to Inbox List if not found
                    if (!item) {
                        console.log("Item not found in SentList, checking InboxList...");
                        response = await requestApi.getInboxListById(rawWorkflow.id, payload);
                        console.log("Polling Response (InboxList):", response);
                        item = response?.data ? findItemInResponse(response.data) : null;
                    }

                    if (item) {
                        console.log("Polling Item Found:", item);
                        const stage = item.stage || item.activityName || 'Start';
                        console.log("Current Stage:", stage);
                        setCurrentStage(stage);

                        if (stage === 'Verifier' || stage === 'Approved' || stage === 'Completed') {
                            console.log("Target Stage Reached. ProcessingScreen will handle transition.");
                            setPollingActive(false);
                            setFetchedRequestData(item);
                            // Do NOT setStep('summary') here; wait for ProcessingScreen animation completion
                        }
                    } else {
                        console.log("Item NOT found in SentList or InboxList.");
                    }

                } catch (error) {
                    console.error("Polling error:", error);
                }
            };

            // Poll every 10 seconds as requested (kept at 10s per recent request)
            intervalId = setInterval(pollData, 10000);

            // Initial call
            pollData();
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [pollingActive, pollingProcessId, rawWorkflow?.id]);


    const handleFolderFetch = async () => {
        if (!rawWorkflow?.repositoryId) return;
        try {
            const response = await folderApi.fetchFoldersById(rawWorkflow?.repositoryId);
            if (response) setRepoData(response);
        } catch (error) {
            console.error("Error fetching folders:", error);
        }
    };

    const resetInput = (ref: React.RefObject<HTMLInputElement | null>) => {
        if (ref.current) ref.current.value = "";
    };

    const handleInvoiceFiles = async (fileList: FileList | null) => {
        const files = Array.from(fileList ?? []);
        const validFiles = files.filter((f) => isPdf(f) && f.size <= MAX_SIZE);

        if (validFiles.length) {
            if (!rawWorkflow?.repositoryId) {
                showToast({ message: "Repository ID is missing. Cannot upload.", variant: "error" });
                return;
            }

            setUploadedFile(validFiles[0]);
            // setUploadedInvoiceName(validFiles[0].name);
            setUploadStatus('uploading');
            setStep('processing'); // Immediate Transition

            try {
                // setIsInvoiceUploading(true); // No longer needed
                let fieldData: any = [];

                // Logic from snippet
                if (repoData?.data?.fields) {
                    const highestLevelObject = repoData?.data?.fields.reduce((acc: any, curr: any) => {
                        return curr.level > acc.level ? curr : acc;
                    });

                    repoData?.data?.fields.forEach((item: any) => {
                        fieldData.push({
                            id: item.id,
                            name: item.name,
                            value: highestLevelObject?.id == item?.id ? validFiles[0].name : "",
                            type: item.dataType
                        });
                    });
                }

                const formData = new FormData();
                formData.append("file", validFiles[0]);
                formData.append("repositoryId", repoData?.data?.id);
                formData.append("fields", JSON.stringify(fieldData));
                formData.append("fileName", validFiles[0].name);

                const { data, error } = await folderApi.uploadFileWithIndex(formData);
                if (data) {
                    setFileId(data?.fileId);
                    setFileData(validFiles[0]);
                    setUploadStatus('success');
                    showToast({ message: "File uploaded successfully", variant: "success" });
                    // No timeout needed here, logic above handles next step
                }
                if (error) {
                    setUploadStatus('error');
                    showToast({ message: "Error uploading file", variant: "error" });
                }
            } catch (error) {
                console.error(error);
                setUploadStatus('error');
                showToast({ message: "Exception uploading file", variant: "error" });
            }
        }
        resetInput(invoiceInputRef);
    };

    // ... (handleCreateRequest remains the same) ...
    const handleCreateRequest = async () => {
        if (!fileId || !fileData || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const payload = {
                workflowId: rawWorkflow?.id,
                review: "Submit",
                comments: [],
                formData: {
                    formId: rawWorkflow?.wFormId,
                    fields: {
                        "9l_i90JwGJV3WGDGv3dj6": [
                            {
                                name: fileData?.name,
                                size: fileData?.size,
                                uploadedPercentage: 100,
                                createdBy: authUserStore.getState()?.session?.email,
                                createdAt: new Date().toISOString(),
                                fileId: fileId
                            }
                        ]
                    },
                    formUpload: [{ jsonId: "9l_i90JwGJV3WGDGv3dj6", isStage: true, fileIds: [fileId], rowid: 0 }]
                },
                fileIds: [],
                task: [],
                hasFormPDF: 0,
                prefix: "",
                mlPrediction: ""
            };

            const response = await workflowApi?.createProcessTransaction(payload);

            // Log response as requested
            console.log("Process Transaction Created Response:", response);

            if (!response?.error) {
                showToast({
                    message: "New Request created successfully",
                    variant: "success",
                    toastTitle: response?.data?.requestNo
                });

                // Start Polling instead of finishing immediately
                if (response?.data?.processId) {
                    setPollingProcessId(response.data.processId);
                    setPollingActive(true);
                    setCurrentStage('Start');
                } else {
                    // Fallback if no processId
                    workflowRefresh();
                    setStep('summary');
                    if (onRequestCreated) onRequestCreated();
                }
            }
        } catch (e) {
            console.error(e);
            setIsSubmitting(false);
        } finally {
            setIsSubmitting(false);
        }
    };


    // const handleCancel = () => {
    //     setUploadedInvoiceName(null)
    //     setUploadedFile(null)
    //     setStep('upload')
    // }

    // Step 2: Processing Screen
    if (step === 'processing') {
        return (
            <AnimateFadeIn className="w-full h-full">
                <ProcessingScreen
                    file={uploadedFile}
                    stage={currentStage}
                    uploadStatus={uploadStatus}
                    onComplete={() => setStep('summary')}
                />
            </AnimateFadeIn>
        )
    }

    // Step 3: Summary Screen (Replaced with Request Overview)
    if (step === 'summary') {
        return (
            <AnimateFadeIn className="fixed inset-0 z-[100] bg-white">
                {/* Pass the live fetched data to Request */}
                <Request
                    item={fetchedRequestData}
                    workflowId={rawWorkflow?.id}
                    onPrev={undefined}
                    onNext={undefined}
                    onBack={() => onClose?.()}
                    hideActions={true}
                />
            </AnimateFadeIn>
        )
    }

    // Step 1: Upload (Existing UI)
    return (
        <AnimateFadeIn className="min-h-[calc(100vh-150px)] overflow-y-auto flex flex-col items-center justify-center bg-surface-muted px-4 py-4 lg:py-6 sm:px-6 lg:px-10">
            <div className="w-full max-w-6xl grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 2xl:gap-12 items-center">

                {/* Left Column: Upload Hub */}
                <AnimateSlideUp className="w-full relative">
                    <div className="group relative bg-white rounded-[2.5rem] border border-[var(--gray-3)] p-2 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1">
                        <div
                            className={[
                                "border-2 border-dashed border-[var(--primary-4)] rounded-[2.2rem] p-6 lg:p-8 xl:p-10 2xl:p-14",
                                "flex flex-col items-center text-center cursor-pointer transition-all duration-300 ease-out",
                                isDragOver ? "bg-[var(--primary-1)]/80 border-[var(--primary-6)] scale-[0.99]" : "hover:bg-[var(--primary-1)]/60 hover:border-[var(--primary-5)]"
                            ].join(" ")}
                            onClick={() => invoiceInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                handleInvoiceFiles(e.dataTransfer.files);
                            }}
                        >
                            <AnimateStagger className="flex flex-col items-center z-10 w-full">
                                {/* Icon Container */}
                                <div className="size-16 2xl:size-20 bg-[var(--primary-1)] rounded-2xl flex items-center justify-center mb-6 2xl:mb-8 group-hover:scale-110 group-hover:bg-[var(--primary-2)] transition-all duration-300">
                                    <Icon name="tabler:cloud-upload" className="size-8 2xl:size-9 text-[var(--primary-9)] transition-colors duration-300" />
                                </div>

                                {/* Headline */}
                                <h2 className="text-2xl 2xl:text-3xl font-bold text-[var(--gray-13)] mb-3 tracking-tight transition-colors duration-300 group-hover:text-[var(--primary-10)]">
                                    Drop your file here, or <span className="text-[var(--primary-9)] underline decoration-transparent group-hover:decoration-[var(--primary-9)] transition-all duration-300">browse</span>
                                </h2>

                                {/* Subtext */}
                                <p className="text-[var(--gray-9)] mb-6 2xl:mb-10 text-sm 2xl:text-base font-medium">
                                    Supports PDF Files · Max 4 MB
                                </p>

                                {/* File Format Pills */}
                                <div className="flex items-center gap-3 flex-wrap justify-center">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--gray-1)] border border-[var(--gray-3)]">
                                        <Icon name="tabler:file-type-pdf" className="size-5 text-[var(--red-9)]" />
                                        <span className="text-xs font-bold text-[var(--gray-11)] uppercase tracking-wider">PDF</span>
                                    </div>
                                </div>
                            </AnimateStagger>

                            <input
                                ref={invoiceInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept={PDF_ACCEPT}
                                onChange={(e) => handleInvoiceFiles(e.target.files)}
                            />

                            {/* Upload State Overlay */}
                            {/* {isInvoiceUploading && (
                                <AnimateFadeIn className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-[2.2rem]">
                                    <div className="size-16 rounded-full border-[4px] border-[var(--gray-2)] border-t-[var(--primary-9)] animate-spin mb-4" />
                                    <h3 className="text-xl font-bold text-[var(--gray-12)]">Uploading Invoice...</h3>
                                    <p className="text-[var(--gray-9)] mt-2">Processing your document</p>
                                </AnimateFadeIn>
                            )} */}
                        </div>
                    </div>
                </AnimateSlideUp>

                {/* Right Column: Info & Features */}
                <div className="flex flex-col relative gap-6 2xl:gap-8 lg:pl-4">
                    <AnimateSlideUp delay={0.1}>
                        <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--gray-13)] mb-4 2xl:mb-6">
                            Intelligent <span className="text-[var(--primary-9)]">AP Agent</span>
                        </h1>
                        <div className="bg-[var(--gray-3)] border border-[var(--gray-4)] rounded-3xl p-5 2xl:p-6">
                            <p className="text-[var(--gray-11)] text-sm leading-relaxed font-medium">
                                Streamline your Accounts Payable. Automatically process invoices, match Purchase Orders, and gain complete visibility into all your payables from a single dashboard.
                            </p>
                        </div>
                    </AnimateSlideUp>

                    <div className="space-y-3 2xl:space-y-4">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 2xl:mb-2">
                            POST-UPLOAD CAPABILITIES
                        </div>

                        {[
                            {
                                title: "Instant Invoice Processing",
                                sub: "Extract and validate invoice data instantly.",
                                icon: "tabler:bolt",
                                color: "text-[var(--indigo-9)] bg-[var(--indigo-2)]"
                            },
                            {
                                title: "Smart PO Matching",
                                sub: "Link invoices to POs with high precision.",
                                icon: "tabler:arrows-join",
                                color: "text-[var(--indigo-9)] bg-[var(--indigo-2)]"
                            },
                            {
                                title: "Payables Overview",
                                sub: "Comprehensive insights into your financial liabilities.",
                                icon: "tabler:chart-pie",
                                color: "text-[var(--indigo-9)] bg-[var(--indigo-2)]"
                            }
                        ].map((item, idx) => (
                            <AnimateSlideUp key={idx} delay={0.2 + (idx * 0.1)} className="group">
                                <div className="flex items-start gap-4 p-3 2xl:p-4 rounded-2xl bg-white border border-[var(--gray-3)] shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className={`shrink-0 size-9 2xl:size-10 rounded-lg flex items-center justify-center ${item.color} mt-1`}>
                                        <Icon name={item.icon} className="size-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--gray-13)]">
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-[var(--gray-10)] mt-1 leading-snug">
                                            {item.sub}
                                        </p>
                                    </div>
                                </div>
                            </AnimateSlideUp>
                        ))}
                    </div>
                </div>

            </div>
        </AnimateFadeIn >
    )
}

export default FileUpload