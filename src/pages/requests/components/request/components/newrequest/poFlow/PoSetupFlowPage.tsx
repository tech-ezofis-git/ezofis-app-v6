import { useMemo, useState } from "react";
import { Stepper } from "@mantine/core";
import Icon from "@/components/base/icon/Icon";

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
        <div className="flex flex-col h-[calc(100vh-110px)] bg-[var(--gray-1)]">
            {/* Top bar stays minimal */}
            <div className="px-5 py-3">
                <div className="mx-auto max-w-[1050px] rounded-2xl border border-[var(--gray-3)] bg-[var(--gray-0)] p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary-9)] to-[var(--violet-9)] text-white">
                                <Icon name="tabler:settings" className="size-5" />
                            </div>
                            <div>
                                <div className="text-16 font-semibold text-[var(--gray-13)]">PO Configuration</div>
                                <div className="text-12 text-[var(--gray-10)]">
                                    Configure PO inputs and mappings.
                                </div>
                            </div>
                        </div>

                        {/* <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onExit();
                            }}
                            className="cursor-pointer rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-4 py-2 text-13 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)]"
                        >
                            Back to Request
                        </button> */}
                    </div>
                </div>
            </div>

            {/* Content + LEFT rail stepper */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
                <div className="mx-auto max-w-[1050px]">
                    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
                        {/* LEFT: Vertical stepper rail */}
                        <div className="lg:sticky lg:top-3">
                            <div className="rounded-2xl border border-[var(--gray-3)] bg-[var(--gray-0)] p-4 shadow-sm">
                                {/* <div className="flex items-center gap-2">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--primary-2)]">
                                        <Icon name="tabler:route" className="size-5 text-[var(--primary-9)]" />
                                    </div>
                                    <div>
                                        <div className="text-14 font-semibold text-[var(--gray-13)]">PO Upload</div>
                                        <div className="text-12 text-[var(--gray-10)]">Follow the steps to finishm setup</div>
                                    </div>
                                </div> */}

                                <div className="mt-4">
                                    <Stepper
                                        active={activeStep}
                                        orientation="vertical"
                                        size="sm"
                                        onStepClick={(step) => {
                                            if (canGoToStep(step)) setActiveStep(step as 0 | 1 | 2);
                                        }}
                                        classNames={{
                                            separator: 'rounded-full bg-gray-3',
                                            step: 'disabled:opacity-50',
                                            stepBody: 'ml-4',
                                            stepCompletedIcon: 'text-white [&>svg]:!size-3.5',
                                            stepDescription: 'm-0 text-13 font-medium text-gray-12',
                                            stepIcon:
                                                'border-0 bg-gray-3 text-13 font-semibold text-gray-11 data-[completed]:bg-green-9 data-[progress]:bg-secondary-8 data-[progress]:text-white',
                                            stepLabel: 'mb-1 text-12 text-gray-10',
                                            stepLoader: 'after:border-gray-11 after:border-t-transparent',
                                            verticalSeparator: 'rounded-full border-gray-3 bg-gray-3',
                                        }}
                                    >
                                        <Stepper.Step label="Upload PO" description="Upload your CSV/XLSX" />
                                        <Stepper.Step label="Column Mapping" description="Align your fields with our system" />
                                        <Stepper.Step label="Review & Confirm" description="Finalize configuration" />
                                    </Stepper>
                                </div>

                                {/* Optional: small status chip */}
                                {/* <div className="mt-4 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-12 font-semibold text-[var(--gray-12)]">Status</div>
                                        <div className="text-12 text-[var(--gray-10)]">{uploadState}</div>
                                    </div>

                                    <div className="mt-2 text-12 text-[var(--gray-10)]">
                                        {uploadedFile ? (
                                            <>
                                                File:{" "}
                                                <span className="font-semibold text-[var(--gray-12)]">{uploadedFile.name}</span>
                                            </>
                                        ) : (
                                            "No file selected yet."
                                        )}
                                    </div>

                                    {uploadedColumns.length ? (
                                        <div className="mt-1 text-12 text-[var(--gray-10)]">
                                            Columns:{" "}
                                            <span className="font-semibold text-[var(--gray-12)]">{uploadedColumns.length}</span>
                                        </div>
                                    ) : null}
                                </div> */}
                            </div>
                        </div>

                        {/* RIGHT: Step screen */}
                        <div className="mt-3">
                            {activeStep === 0 ? (
                                <Step1TemplateUpload
                                    uploadState={uploadState}
                                    setUploadState={setUploadState}
                                    uploadedFile={uploadedFile}
                                    setUploadedFile={setUploadedFile}
                                    uploadedColumns={uploadedColumns}
                                    setUploadedColumns={setUploadedColumns}
                                    onNext={() => setActiveStep(1)}
                                    onCancel={() => closeNewRequest()}
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
                                    onBack={() => setActiveStep(0)}
                                    onNext={() => setActiveStep(2)}
                                />
                            ) : null}

                            {activeStep === 2 ? (
                                <Step3PreviewConfirm
                                    systemColumns={systemColumns as any}
                                    mapping={mapping}

                                    onBack={() => setActiveStep(1)}
                                    onConfirm={() => {
                                        handlePoUpload();
                                    }}
                                    isSubmitting={isSubmitting}
                                // setIsSubmitting={setIsSubmitting}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
