import { useMemo, useState } from "react";
import Icon from "@/components/base/icon/Icon";
import cn from "@/utils/cn";

import Step1TemplateUpload from "./steps/Step1TemplateUpload";
import Step2ColumnMapping from "./steps/Step2ColumnMapping";
import Step3PreviewConfirm from "./steps/Step3PreviewConfirm";

import { SYSTEM_TEMPLATE_COLUMNS } from "./utils/templateSchema";
import requestStore from "@/pages/requests/stores/useRequestStore";
import folderApi from "@/api/folders/folders";
import showToast from "@/components/base/toast/showToast";

import * as XLSX from 'xlsx';


type Props = {
    // onExit: () => void;
    onClose: () => void;
};

export type UploadState = "idle" | "uploading" | "parsing" | "ready" | "error";

export default function PoSetupFlowPage({ }: Props) {

    const { closeNewRequest } = requestStore((state) => state)
    const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);

    const [uploadState, setUploadState] = useState<UploadState>("idle");
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadedColumns, setUploadedColumns] = useState<string[]>([]);
    const [rowCount, setRowCount] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const systemColumns = useMemo(() => SYSTEM_TEMPLATE_COLUMNS, []);

    const [mapping, setMapping] = useState<Record<string, string>>({});
    // const [errors, setErrors] = useState<string[]>([]);
    // const [warnings, setWarnings] = useState<string[]>([]);

    const canGoToStep = (step: number) => {
        // Always allow going backwards
        if (step <= activeStep) return true;

        // Gate forward navigation:
        // Step 1 -> Step 2 requires columns extracted
        if (step === 1) return uploadedColumns.length > 0;

        // Step 2 -> Step 3 requires mapping exists (basic, you can tighten later)
        if (step === 2) return uploadedColumns.length > 0 && Object.keys(mapping).length > 0;

        return false;
    };

    // Function to update the uploaded file with mapped headers
    const updateFileHeaders = async (file: File, mapping: Record<string, string>) => {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();

        return new Promise<File>((resolve, reject) => {
            // Handle CSV files
            if (fileExtension === 'csv') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        const csvData = event.target.result as string;
                        const lines = csvData.split('\n');
                        const headers = lines[0].split(',');

                        // Update headers based on the mapping
                        const updatedHeaders = headers.map(header => mapping[header.trim()] || header);
                        lines[0] = updatedHeaders.join(',');

                        // Re-create the updated CSV file
                        const updatedCsv = new Blob([lines.join('\n')], { type: 'text/csv' });
                        resolve(new File([updatedCsv], fileName, { type: 'text/csv' }));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsText(file);
            }

            // Handle XLSX files
            else if (fileExtension === 'xlsx') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        const data = event.target.result as ArrayBuffer;
                        const wb = XLSX.read(data, { type: 'array' });
                        const sheet = wb.Sheets[wb.SheetNames[0]];
                        const rows: any = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                        // Update headers based on the mapping
                        const updatedHeaders = rows[0].map((header: string) => mapping[header.trim()] || header);
                        rows[0] = updatedHeaders;

                        // Create a new workbook with updated headers
                        const updatedSheet = XLSX.utils.aoa_to_sheet(rows);
                        const updatedWb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(updatedWb, updatedSheet, 'Sheet1');

                        // Convert the workbook back to a Blob
                        const updatedBlob = XLSX.write(updatedWb, { bookType: 'xlsx', type: 'array' });
                        resolve(new File([updatedBlob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            }
        });
    };
    const sendUpdatedFile = async (file: File) => {
        const payload = {
            formId: 3,
            file: file,
        };

        try {
            const { data, error } = await folderApi.uploadMasterFile(payload);
            if (data) {
                showToast({ message: "PO data file uploaded successfully", variant: "success" });
            }

            if (error) {
                showToast({ message: "Error uploading file", variant: "error" });
            }
        } catch (error) {
            showToast({ message: "Error uploading file", variant: "error" });
            console.error(error);
        } finally {
            closeNewRequest();
        }
    };

    const handleConfirmMapping = async () => {
        try {
            // Update the file headers with the mapped master field names
            const updatedFile = await updateFileHeaders(uploadedFile as File, mapping);

            // Send the updated file to the server
            await sendUpdatedFile(updatedFile);
        } catch (error) {
            showToast({ message: "Error processing file", variant: "error" });
        }
    };


    const handlePoUpload = async () => {
        setIsSubmitting(true)
        try {
            await handleConfirmMapping();
        } catch (error) {
            showToast({ message: "Error uploading file", variant: "error" });
            console.error(error);
        } finally {
            setUploadState("idle");
            setIsSubmitting(false)
        }
    }



    return (
        <div className="flex h-[calc(100vh-110px)] items-center justify-center bg-surface-secondary p-4 text-gray-13 overflow-hidden">
            <div className="flex flex-col max-w-4xl w-full max-h-full bg-surface-primary rounded-3xl shadow-2xl border border-gray-3 overflow-hidden">
                {/* Header Section */}
                <header className="px-6 pt-6 pb-4 flex items-center gap-4 shrink-0">
                    <div className="w-10 h-10 bg-primary-9 flex items-center justify-center rounded-full shrink-0 shadow-lg shadow-primary-9/20">
                        <Icon name="tabler:settings" className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-13 tracking-tight">PO Configuration</h1>
                        <p className="text-xs font-medium text-gray-11">Configure PO inputs and mappings.</p>
                    </div>
                </header>

                {/* Horizontal Stepper */}
                <div className="px-6 py-4 bg-surface-secondary/50 border-y border-gray-3 shrink-0">
                    <div className="max-w-2xl mx-auto relative px-4">
                        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-3 z-0"></div>
                        <div
                            className="absolute top-5 left-0 h-0.5 bg-secondary-9 transition-all duration-500 z-0"
                            style={{ width: `${(activeStep / 2) * 100}%` }}
                        />
                        <div className="relative z-10 flex justify-between">
                            {[
                                { label: "Upload PO", step: 0 },
                                { label: "Column Mapping", step: 1 },
                                { label: "Review & Confirm", step: 2 }
                            ].map((s) => (
                                <div key={s.step} className="flex flex-col items-center">
                                    <div
                                        onClick={() => {
                                            if (canGoToStep(s.step)) setActiveStep(s.step as 0 | 1 | 2);
                                        }}
                                        className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-surface-primary cursor-pointer transition-all duration-300",
                                            activeStep === s.step
                                                ? "bg-secondary-9 text-white shadow-lg shadow-secondary-9/40"
                                                : activeStep > s.step
                                                    ? "bg-secondary-9 text-white"
                                                    : "bg-surface-primary border-2 border-gray-3 text-gray-10"
                                        )}
                                    >
                                        {activeStep > s.step ? <Icon name="tabler:check" className="size-5" /> : s.step + 1}
                                    </div>
                                    <span className={cn(
                                        "mt-2 text-[10px] font-bold tracking-tight uppercase transition-colors duration-300",
                                        activeStep >= s.step ? "text-secondary-11" : "text-gray-10"
                                    )}>
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeStep === 0 ? (
                        <Step1TemplateUpload
                            uploadState={uploadState}
                            setUploadState={setUploadState}
                            uploadedFile={uploadedFile}
                            setUploadedFile={setUploadedFile}
                            uploadedColumns={uploadedColumns}
                            setUploadedColumns={setUploadedColumns}
                            onNext={() => setActiveStep(1)}
                            rowCount={rowCount}
                            setRowCount={setRowCount}
                        />
                    ) : null}

                    {activeStep === 1 ? (
                        <Step2ColumnMapping
                            systemColumns={systemColumns as any}
                            uploadedColumns={uploadedColumns}
                            mapping={mapping}
                            setMapping={setMapping}
                        />
                    ) : null}

                    {activeStep === 2 ? (
                        <Step3PreviewConfirm
                            systemColumns={systemColumns as any}
                            mapping={mapping}
                        />
                    ) : null}
                </main>

                {/* Footer Section */}
                <footer className="px-6 py-4 bg-surface-primary border-t border-gray-3 flex justify-between items-center shrink-0">
                    {/* <button
                        onClick={() => closeNewRequest()}
                        className="px-6 py-2.5 text-xs font-bold text-gray-11 hover:text-gray-13 transition-colors uppercase tracking-widest"
                    >
                        Cancel
                    </button> */}
                    <button
                        onClick={() => closeNewRequest()}
                        className="group cursor-pointer inline-flex items-center gap-2 rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-2 py-2 text-12 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)] transition-colors"
                    >
                        <Icon name="tabler:chevron-left" className="size-5 transition-transform group-hover:-translate-x-1" />
                        Cancel
                    </button>
                    <div className="flex items-center gap-3">
                        {activeStep > 0 && (
                            <button
                                onClick={() => setActiveStep((prev) => (prev - 1) as any)}
                                className="px-5 py-2.5 border border-gray-3 rounded-full text-xs font-bold text-gray-11 hover:bg-surface-secondary transition-all active:scale-95"
                            >
                                Back
                            </button>
                        )}
                        <button
                            disabled={!canGoToStep(activeStep + 1) && activeStep < 2 || (activeStep === 2 && isSubmitting)}
                            onClick={() => {
                                if (activeStep < 2) {
                                    setActiveStep((prev) => (prev + 1) as any);
                                } else {
                                    handlePoUpload();
                                }
                            }}
                            className={cn(
                                "flex items-center gap-2 px-8 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all active:scale-95",
                                (!canGoToStep(activeStep + 1) && activeStep < 2) || (activeStep === 2 && isSubmitting)
                                    ? "bg-gray-3 text-gray-10 cursor-not-allowed shadow-none"
                                    : "bg-primary-9 hover:bg-primary-10 text-white shadow-primary-9/20"
                            )}
                        >
                            {activeStep === 2 ? (
                                isSubmitting ? "Processing..." : "Confirm & Finish"
                            ) : (
                                <>
                                    Continue
                                    <Icon name="tabler:arrow-right" className="text-base" />
                                </>
                            )}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
