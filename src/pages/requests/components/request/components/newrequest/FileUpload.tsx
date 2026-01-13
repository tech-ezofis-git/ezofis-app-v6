import React, { useEffect, useRef, useState } from "react";
import Icon from "@/components/base/icon/Icon";
// import Button from "@/components/base/button/Button";
import Alert from "@/components/base/Alert";
import Footer from "./Footer";

import { PDF_ACCEPT } from "./utils";
import { isPdf, MAX_SIZE } from "./utils";
import type { Props } from "./type";

import requestStore from "@/pages/requests/stores/useRequestStore";
import folderApi from "@/api/folders/folders";
import authUserStore from "../../../../../../stores/authUserStore";
import workflowApi from "../../../../../../api/workflow/workflow";
// import FileUpload from "@/components/common/file-upload/FIleUpload";

import {
    AnimateFadeIn,
    AnimateSlideUp,
    AnimateScale,
    AnimateStagger,
    // AnimateSlideRight,
    AnimateEntrancePop
} from "@/components/common/animations";
import showToast from "@/components/base/toast/showToast";
import { motion } from "motion/react";

const FileUplaod = ({ onClose }: Props) => {
    const rawWorkflow = requestStore((state) => state.rawWorkflowData);
    const workflowRefresh = requestStore((state) => state.workflowRefresh);

    const invoiceInputRef = useRef<HTMLInputElement | null>(null);

    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadedInvoiceName, setUploadedInvoiceName] = useState<string | null>(null);
    const [repoData, setRepoData] = useState<any>(null);
    const [fileId, setFileId] = useState<string | null>(null);
    const [fileData, setFileData] = useState<File | null>(null);
    const [isInvoiceUploading, setIsInvoiceUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        handleFolderFetch();
    }, []);

    const resetInput = (ref: React.RefObject<HTMLInputElement | null>) => {
        if (ref.current) ref.current.value = "";
    };

    const handleFolderFetch = async () => {
        try {
            const response = await folderApi.fetchFoldersById(rawWorkflow?.repositoryId);
            if (response) setRepoData(response);
        } catch (error) {
            console.error("Error fetching folders:", error);
        }
    };

    const handleInvoiceFiles = async (fileList: FileList | null) => {
        const files = Array.from(fileList ?? []);
        const validFiles = files.filter((f) => isPdf(f) && f.size <= MAX_SIZE);

        if (validFiles.length) {
            try {
                setIsInvoiceUploading(true);
                let fieldData: any = [];
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

                const formData = new FormData();
                formData.append("file", validFiles[0]);
                formData.append("repositoryId", repoData?.data?.id);
                formData.append("fields", JSON.stringify(fieldData));
                formData.append("fileName", validFiles[0].name);

                const { data, error } = await folderApi.uploadFileWithIndex(formData);
                if (data) {
                    setFileId(data?.fileId);
                    setFileData(validFiles[0]);
                    setUploadedInvoiceName(validFiles[0].name);
                    showToast({ message: "File uploaded successfully", variant: "success" });
                }
                if (error) {
                    showToast({ message: "Error uploading file", variant: "error" });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsInvoiceUploading(false);
            }
        }
        resetInput(invoiceInputRef);
    };

    const handleSubmit = async () => {
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
            if (!response?.error) {
                showToast({
                    message: "New Request created successfully",
                    variant: "success",
                    toastTitle: response?.data?.requestNo
                });
            }
            workflowRefresh();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Feature Cards Data ---
    // const features = [
    //     {
    //         title: "Lightning Fast",
    //         description: "Process documents faster with our agentic pipeline",
    //         icon: "tabler:bolt",
    //         colorClass: "bg-[var(--orange-2)] text-[var(--orange-9)]", // Yellow/Orange theme
    //     },
    //     {
    //         title: "100% Accuracy",
    //         description: "Industry-leading extraction accuracy",
    //         icon: "tabler:sparkles",
    //         colorClass: "bg-[var(--purple-2)] text-[var(--purple-9)]", // Purple theme
    //     },
    //     {
    //         title: "Any Format",
    //         description: "Support for PDF, images, and scanned documents",
    //         icon: "tabler:files", // or tabler:clock based on your image
    //         colorClass: "bg-[var(--green-2)] text-[var(--green-9)]", // Green theme
    //     },
    // ];

    return (
        <AnimateFadeIn className="h-[calc(100vh-110px)] overflow-hidden flex flex-col bg-[var(--gray-1)]">
            <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col items-center">
                <div className="w-full max-w-[850px] flex flex-col gap-6">

                    {/* INVOICE Upload Card */}
                    <AnimateSlideUp className="rounded-2xl border border-[var(--gray-4)] bg-[var(--gray-0)] p-5 shadow-sm">
                        <AnimateEntrancePop>
                            <h3 className="text-center text-lg font-semibold text-[var(--gray-13)]">Upload Invoice</h3>
                            <p className="mb-3 text-center text-12 leading-relaxed text-[var(--gray-11)] mx-auto max-w-[650px]">
                                Drop your invoice PDFs here to streamline extraction and validation. We’ll use the uploaded invoice data
                                to accelerate downstream matching and reconciliation.
                            </p>
                        </AnimateEntrancePop>

                        <AnimateScale>
                            <div
                                className={[
                                    "group relative w-full h-[250px] rounded-3xl border-2 border-dashed transition-all duration-300",
                                    "flex flex-col items-center justify-center gap-6 p-8 cursor-pointer",
                                    isDragOver
                                        ? "border-[var(--primary-9)] bg-[var(--primary-2)] scale-[1.01]"
                                        : "border-[var(--violet-4)] bg-[var(--gray-0)] hover:border-[var(--primary-7)] hover:bg-[var(--primary-1)]"
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
                                <AnimateStagger className="mt-4 flex items-center gap-4">
                                    <div className="flex size-16 items-center justify-center rounded-lg bg-[var(--primary-3)] text-[var(--primary-9)] shadow-sm">
                                        <Icon name="tabler:upload" className="size-6" />
                                    </div>
                                </AnimateStagger>

                                <div className="text-center">
                                    <div className="text-20 font-medium text-[var(--gray-12)]">
                                        Drop your file here, or <span className="text-[var(--primary-9)]">browse</span>
                                    </div>
                                    <div className="mt-2 text-14 text-[var(--gray-10)]">Supports PDF ONLY</div>
                                </div>

                                <AnimateStagger className="mb-4 flex items-center gap-4">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--red-3)] text-[var(--red-9)] shadow-sm">
                                        <Icon name="tabler:file-type-pdf" className="size-6" />
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

                                {isInvoiceUploading && (
                                    <AnimateFadeIn className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-[var(--gray-0)] bg-opacity-80 backdrop-blur-sm">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="size-10 rounded-full border-4 border-[var(--primary-9)] border-t-transparent animate-spin" />
                                            <motion.span
                                                initial={{ opacity: 0.5 }}
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                className="text-14 font-medium text-[var(--primary-11)]"
                                            >
                                                Uploading Invoice...
                                            </motion.span>
                                        </div>
                                    </AnimateFadeIn>
                                )}
                            </div>
                        </AnimateScale>

                        {uploadedInvoiceName && (
                            <AnimateEntrancePop className="mt-8">
                                <Alert text={`Selected File: ${uploadedInvoiceName}`} variant="green" />
                            </AnimateEntrancePop>
                        )}
                    </AnimateSlideUp>

                    {/* Agentic Intelligence Feature Section */}
                    {/* <AnimateSlideUp delay={0.2} className="mt-4 flex flex-col items-center">
                        <h2 className="text-center text-lg font-bold text-[var(--gray-13)]">
                            Pure Agentic Document Intelligence
                        </h2>
                        <p className="mt-1 text-center text-13 text-[var(--gray-10)] mb-6">
                            Extract structured data from any document without LLM using VRP (Visual Reasoning Processor)
                        </p>

                        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
                            {features.map((feature, index) => (
                                <AnimateStagger key={index}>
                                    <div className="flex h-full flex-col rounded-xl border border-[var(--gray-3)] bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
                                        <div className={`mb-4 flex size-10 items-center justify-center rounded-lg ${feature.colorClass}`}>
                                            <Icon name={feature.icon} className="size-5" />
                                        </div>
                                        <h4 className="mb-2 text-14 font-bold text-[var(--gray-12)]">
                                            {feature.title}
                                        </h4>
                                        <p className="text-13 leading-relaxed text-[var(--gray-10)]">
                                            {feature.description}
                                        </p>
                                    </div>
                                </AnimateStagger>
                            ))}
                        </div>
                    </AnimateSlideUp> */}

                </div>
            </div>

            <AnimateSlideUp className="shrink-0 border-t border-[var(--gray-3)] bg-[var(--gray-0)] px-4">
                <Footer onClose={onClose} onPrimaryClick={handleSubmit} isPrimaryLoading={isSubmitting} />
            </AnimateSlideUp>
        </AnimateFadeIn >
    );
};

FileUplaod.displayName = "FileUplaod";
export default FileUplaod;