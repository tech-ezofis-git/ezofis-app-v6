import { useEffect, useRef, useState } from 'react'
import Icon from '../../../../../../components/base/icon/Icon'
import { AnimateFadeIn, AnimateSlideUp, AnimateStagger, AnimateEntrancePop } from '../../../../../../components/common/animations'
import { PDF_ACCEPT, IMAGE_ACCEPT, isPdf, isImage, MAX_SIZE } from './utils'
import showToast from '@/components/base/toast/showToast'
import folderApi from "@/api/folders/folders"
import workflowApi from "@/api/workflow/workflow"
import authUserStore from "@/stores/authUserStore"
import requestStore from "@/pages/requests/stores/useRequestStore"

const FileUpload = ({ onClose }: { onClose?: () => void }) => {
    const rawWorkflow = requestStore((state) => state.rawWorkflowData);
    const workflowRefresh = requestStore((state) => state.workflowRefresh);

    const invoiceInputRef = useRef<HTMLInputElement>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    // const [isInvoiceUploading, setIsInvoiceUploading] = useState(false) // Removed unused state
    // const [uploadedInvoiceName, setUploadedInvoiceName] = useState<string | null>(null)

    // Flow State
    const [fileData, setFileData] = useState<File | null>(null)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

    // API State
    const [repoData, setRepoData] = useState<any>(null);
    const [fileId, setFileId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        handleFolderFetch();
    }, []);

    // Trigger creation automatically when upload is complete
    useEffect(() => {
        if (uploadStatus === 'success' && fileId && fileData && !isSubmitting) {
            handleCreateRequest();
        }
    }, [uploadStatus, fileId, fileData]);



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
        const validFiles = files.filter((f) => (isPdf(f) || isImage(f)) && f.size <= MAX_SIZE);

        console.log("Files selected:", files);
        console.log("Valid files:", validFiles);
        console.log("Raw Workflow:", rawWorkflow);
        console.log("Repo Data:", repoData);

        if (!validFiles.length && files.length > 0) {
            const tooLarge = files.some(f => f.size > MAX_SIZE);
            const invalidType = files.some(f => !isPdf(f) && !isImage(f));
            
            if (tooLarge) showToast({ message: "File is too large. Max size is 4MB.", variant: "error" });
            else if (invalidType) showToast({ message: "Invalid file type. Please upload a PDF or Image.", variant: "error" });
            else showToast({ message: "No valid files selected.", variant: "error" });
            
            resetInput(invoiceInputRef);
            return;
        }

        if (validFiles.length) {
            if (!rawWorkflow?.repositoryId) {
                console.error("Missing repositoryId in rawWorkflow:", rawWorkflow);
                showToast({ message: "Repository ID is missing. Cannot upload.", variant: "error" });
                return;
            }
            if (!repoData?.data?.id) {
                console.error("Missing repoData.data.id:", repoData);
                // Attempt to fetch again if missing
                handleFolderFetch();
                showToast({ message: "Repository folder data is missing. Please try again in a moment.", variant: "error" });
                return;
            }

            setFileData(validFiles[0]);
            setUploadStatus('uploading');

            try {
                let fieldData: any = [];

                if (repoData?.data?.fields) {
                    const highestLevelObject = repoData?.data?.fields.reduce((acc: any, curr: any) => {
                        return (curr.level || 0) > (acc.level || 0) ? curr : acc;
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
                formData.append("repositoryId", String(repoData?.data?.id));
                formData.append("fields", JSON.stringify(fieldData));
                formData.append("fileName", validFiles[0].name);

                console.log("Uploading file with formData:", {
                    repositoryId: repoData?.data?.id,
                    fileName: validFiles[0].name,
                    fieldCount: fieldData.length
                });

                const { data, error } = await folderApi.uploadFileWithIndex(formData);
                if (data) {
                    console.log("Upload success:", data);
                    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                    setFileId(parsedData?.fileId || data?.fileId);
                    setUploadStatus('success');
                }
                if (error) {
                    console.error("Upload error:", error);
                    setUploadStatus('error');
                    showToast({ message: `Error uploading file: ${error}`, variant: "error" });
                }
            } catch (error: any) {
                console.error("Upload exception:", error);
                setUploadStatus('error');
                showToast({ message: `Exception uploading file: ${error.message || error}`, variant: "error" });
            }
        }
        resetInput(invoiceInputRef);
    };

    // ... (handleCreateRequest remains the same) ...
    const handleCreateRequest = async () => {
        if (!fileId || !fileData) {
            console.error("Cannot create request: missing fileId or fileData", { fileId, fileData });
            if (uploadStatus === 'success') {
                showToast({ message: "Request creation failed: missing file reference. Please try again.", variant: "error" });
            }
            return;
        }
        if (isSubmitting) return;

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
                const processId = response?.data?.processId;
                const requestNo = response?.data?.requestNo;

                // Add to background processing
                if (processId) {
                    requestStore.getState().addProcessingProcess({
                        processId,
                        id: processId,
                        requestNo,
                        name: fileData?.name,
                        stage: 'Start',
                        workflowId: rawWorkflow?.id,
                        fileId,
                        repositoryId: rawWorkflow?.repositoryId
                    });
                }

                showToast({
                    message: "Request created. AI is analyzing in the background.",
                    variant: "success",
                    toastTitle: requestNo
                });

                // Trigger list refresh
                workflowRefresh();
                
                // Close the upload sheet immediately
                if (onClose) onClose();
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

    // Step 1: Upload (Premium Centered UI)
    return (
        <AnimateFadeIn className="h-full overflow-y-auto flex flex-col items-center justify-center bg-surface-muted px-4 py-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-4xl flex flex-col gap-6 items-center">

                {/* Header Section */}
                <AnimateSlideUp className="text-center space-y-1">
                    <h1 className="text-2xl font-bold text-[var(--gray-13)] tracking-tight">
                        Intelligent <span className="text-[var(--primary-9)]">AP Agent</span>
                    </h1>
                    <p className="text-[var(--gray-10)] text-sm max-w-xl mx-auto font-medium">
                        Streamline your Accounts Payable. Automatically process invoices, match Purchase Orders, and gain complete visibility.
                    </p>
                </AnimateSlideUp>

                {/* Main Upload Hub */}
                <AnimateSlideUp delay={0.1} className="w-full max-w-3xl">
                    <div className="group relative bg-white rounded-2xl border border-[var(--gray-3)] p-2 transition-all duration-700 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1">
                        
                        {/* Interactive "Loading/Scanning" Hover Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--primary-2)]/20 to-transparent h-1/2 w-full animate-[scan_3s_linear_infinite]" />
                        </div>

                        <div
                            className={[
                                "border-[2px] border-dashed border-[var(--primary-4)] rounded-xl p-6 lg:p-8",
                                "flex flex-col items-center text-center cursor-pointer transition-all duration-500 ease-out relative z-10",
                                isDragOver ? "bg-[var(--primary-1)] border-[var(--primary-6)] scale-[0.99]" : "bg-white hover:bg-[var(--primary-1)]/30 hover:border-[var(--primary-5)]",
                                (uploadStatus === 'uploading' || isSubmitting) ? "pointer-events-none opacity-60" : ""
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
                            {(uploadStatus === 'uploading' || isSubmitting) ? (
                                <div className="flex flex-col items-center py-8">
                                    <div className="size-16 bg-[var(--primary-1)] rounded-full flex items-center justify-center mb-6 animate-pulse">
                                        <Icon name="tabler:loader-2" className="size-8 text-[var(--primary-9)] animate-spin" />
                                    </div>
                                    <h2 className="text-xl font-bold text-[var(--gray-13)] mb-2 animate-pulse">
                                        {uploadStatus === 'uploading' ? 'Uploading Invoice...' : 'Creating Request...'}
                                    </h2>
                                    <p className="text-[var(--gray-10)] text-sm font-medium">
                                        Please wait while we process your document
                                    </p>
                                </div>
                            ) : (
                                <AnimateStagger className="flex flex-col items-center w-full">
                                    {/* Icon Container */}
                                    <div className="size-16 bg-[var(--primary-1)] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-500 shadow-sm">
                                        <Icon name="tabler:cloud-upload" className="size-8 text-[var(--primary-9)]" />
                                    </div>

                                    {/* Headline */}
                                    <h2 className="text-xl font-medium text-[var(--gray-13)] mb-2 tracking-tight">
                                        Drop your file here, or <span className="text-[var(--primary-9)]">browse</span>
                                    </h2>

                                    {/* Subtext */}
                                    <p className="text-[var(--gray-9)] mb-5 text-xs font-medium">
                                        Supports PDF and Images · Max 4 MB
                                    </p>

                                </AnimateStagger>
                            )}



                            <input
                                ref={invoiceInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept={`${PDF_ACCEPT},${IMAGE_ACCEPT}`}
                                onChange={(e) => handleInvoiceFiles(e.target.files)}
                            />
                        </div>
                    </div>
                </AnimateSlideUp>

                {/* Bottom Capabilities - Kept from original but repositioned */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            title: "Instant Processing",
                            sub: "AI-powered extraction in seconds",
                            icon: "tabler:bolt",
                            color: "text-[var(--orange-9)] bg-[var(--orange-2)]"
                        },
                        {
                            title: "Smart PO Matching",
                            sub: "Link invoices to POs with precision.",
                            icon: "tabler:sparkles",
                            color: "text-[var(--indigo-9)] bg-[var(--indigo-2)]"
                        },
                        {
                            title: "Payables Overview",
                            sub: "Insights into your liabilities.",
                            icon: "tabler:clock",
                            color: "text-emerald-600 bg-[#ecfdf5]"
                        }
                    ].map((item, idx) => (
                        <AnimateEntrancePop key={idx} delay={0.4 + (idx * 0.1)}>
                            <div className="group p-6 rounded-xl bg-white border border-[var(--gray-3)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start text-left h-full">
                                <div className={`shrink-0 size-9 2xl:size-10 rounded-lg flex items-center justify-center ${item.color} mt-1 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon name={item.icon} className="size-5 group-hover:rotate-6 transition-transform duration-300" />
                                </div>
                                <h4 className="text-sm font-medium text-[var(--gray-13)] tracking-tight">
                                    {item.title}
                                </h4>
                                <p className="text-xs text-[var(--gray-10)] mt-2 leading-relaxed font-medium">
                                    {item.sub}
                                </p>
                            </div>
                        </AnimateEntrancePop>
                    ))}
                </div>

            </div>

            {/* Custom Scan Animation Style */}
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(200%); }
                }
            `}</style>
        </AnimateFadeIn >
    )
}

export default FileUpload