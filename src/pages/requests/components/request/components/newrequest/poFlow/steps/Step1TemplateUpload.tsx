import { useRef, useState } from "react";
import Icon from "@/components/base/icon/Icon";
import Alert from "@/components/base/Alert";
import { downloadTemplate, PO_ACCEPT } from "../../utils";
import authUserStore from "../../../../../../../../stores/authUserStore";
import showToast from "@/components/base/toast/showToast";
import type { UploadState } from "../PoSetupFlowPage";
import { motion } from "framer-motion";

import {
    AnimateFadeIn,
    AnimateSlideUp,
    AnimateScale,
    AnimateStagger,
    AnimateEntrancePop
} from "@/components/common/animations";

import Papa from "papaparse";
import * as XLSX from "xlsx";

type Props = {
    uploadState: UploadState;
    setUploadState: (s: UploadState) => void;
    uploadedFile: File | null;
    setUploadedFile: (f: File | null) => void;
    uploadedColumns: string[];
    setUploadedColumns: (c: string[]) => void;
    onNext: () => void;
};

async function extractHeaders(file: File): Promise<string[]> {
    const name = file.name.toLowerCase();
    const parseCsv = async (csvFileOrText: File | string): Promise<string[]> => {
        return await new Promise((resolve, reject) => {
            Papa.parse(csvFileOrText as any, {
                header: true,
                skipEmptyLines: true,
                preview: 1,
                complete: (results) => {
                    const fields = (results.meta?.fields ?? []).map(normalizeHeader).filter(Boolean);
                    if (!fields.length) reject(new Error("No header row found in CSV."));
                    else resolve(fields);
                },
                error: (err) => reject(err)
            });
        });
    };

    if (name.endsWith(".csv")) return parseCsv(file);
    if (name.endsWith(".xlsx")) {
        const buf = await file.arrayBuffer();
        const u8 = new Uint8Array(buf);
        const looksLikeZip = u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b;
        if (!looksLikeZip) {
            const text = await file.text();
            return parseCsv(text);
        }
        try {
            const wb = XLSX.read(u8, { type: "array" });
            const firstSheetName = wb.SheetNames?.[0];
            if (!firstSheetName) throw new Error("No sheets found in XLSX.");
            const ws = wb.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][];
            const headerRow = rows?.[0] ?? [];
            const headers = headerRow.map(normalizeHeader).filter(Boolean);
            return headers;
        } catch {
            const text = await file.text();
            return parseCsv(text);
        }
    }
    throw new Error("Unsupported file type.");
}

function normalizeHeader(h: unknown) {
    return String(h ?? "").trim().replace(/\s+/g, " ");
}

export default function Step1TemplateUpload({
    uploadState,
    setUploadState,
    uploadedFile,
    setUploadedFile,
    uploadedColumns,
    setUploadedColumns,
    onNext
}: Props) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false); // New loading state
    const tenantId = authUserStore.getState()?.session?.tenantId;

    const onFileChange = async (file: File | undefined) => {
        if (!file) return;

        const lower = file.name.toLowerCase();
        const isAllowed = lower.endsWith(".csv") || lower.endsWith(".xlsx");

        if (!isAllowed) {
            showToast({ message: "Please upload only CSV or XLSX files", variant: "error" });
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            setUploadState("parsing");
            setUploadedFile(file);

            const headers = await extractHeaders(file);
            setUploadedColumns(headers);

            showToast({ message: `Detected ${headers.length} columns`, variant: "success" });
            setUploadState("ready");
            onNext();
        } catch (err) {
            setUploadState("error");
            showToast({
                message: err instanceof Error ? err.message : "Failed to parse file",
                variant: "error"
            });
        }
    };

    const handleDownload = async (e: React.MouseEvent) => {

        if (isDownloading) return;

        setIsDownloading(true);
        try {
            const fileUrl = downloadTemplate(tenantId as string);
            // Programmatic download to allow for the loading state to be visible
            const link = document.createElement("a");
            link.href = fileUrl;
            link.setAttribute("download", "template.xlsx");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Simulating a brief delay so the spinner is visible to the user
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
            showToast({ message: "Failed to download template", variant: "error" });
            console.error(e)
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <AnimateFadeIn className="flex flex-col gap-4">
            <AnimateSlideUp className="rounded-2xl border border-[var(--gray-4)] bg-[var(--gray-0)] p-6 shadow-sm">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-6">
                    <AnimateEntrancePop>
                        <h3 className="text-lg font-semibold text-[var(--gray-13)]">Upload Purchase Order</h3>
                        <p className="text-12 text-[var(--gray-11)]">
                            Upload your PO file (CSV or XLSX) to begin the mapping process.
                        </p>
                    </AnimateEntrancePop>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={` cursor-pointer inline-flex items-center gap-2 rounded-lg border border-[var(--gray-4)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--gray-11)] transition-all 
                            ${isDownloading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[var(--gray-2)] hover:text-[var(--gray-13)]'}`}
                    >
                        {isDownloading ? (
                            <span className="size-3 border-2 border-[var(--gray-11)] border-t-transparent animate-spin rounded-full" />
                        ) : (
                            <Icon name="tabler:download" className="size-3.5" />
                        )}
                        {isDownloading ? "Preparing..." : "Download Template"}
                    </button>
                </div>

                {/* Upload Zone */}
                <AnimateScale>
                    <div
                        className={[
                            "group relative w-full h-[250px] rounded-3xl border-2 border-dashed transition-all duration-300",
                            "flex flex-col items-center justify-center gap-4 p-8 cursor-pointer",
                            isDragOver
                                ? "border-[var(--primary-9)] bg-[var(--primary-2)] scale-[1.01]"
                                : "border-[var(--gray-4)] bg-[var(--gray-1)] hover:border-[var(--primary-7)] hover:bg-[var(--primary-1)]"
                        ].join(" ")}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            onFileChange(e.dataTransfer.files?.[0]);
                        }}
                    >
                        <AnimateStagger className="flex items-center gap-4">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-3)] text-[var(--primary-9)] shadow-sm">
                                <Icon name="tabler:file-upload" className="size-7" />
                            </div>
                        </AnimateStagger>

                        <div className="text-center">
                            <div className="text-18 font-medium text-[var(--gray-12)]">
                                Drop your PO file here, or <span className="text-[var(--primary-9)]">browse</span>
                            </div>
                            <div className="mt-1 text-13 text-[var(--gray-10)]">
                                Accepted formats: <span className="font-semibold uppercase">CSV, XLSX</span>
                            </div>
                        </div>

                        {/* File Type Icons */}
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1 rounded-md bg-[var(--green-4)] px-2 py-1 text-10 font-bold text-[var(--green-11)]">
                                <Icon name="tabler:file-type-csv" className="size-7 text-green-11" />
                            </div>
                            <div className="flex items-center gap-1 rounded-md bg-[var(--blue-4)] px-2 py-1 text-10 font-bold text-[var(--blue-11)]">
                                <Icon name="tabler:file-type-xls" className="size-7 text-blue-11" />
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={PO_ACCEPT}
                            onChange={(e) => onFileChange(e.target.files?.[0])}
                        />

                        {/* Parsing Overlay */}
                        {(uploadState === "parsing") && (
                            <AnimateFadeIn className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-[var(--gray-0)]/80 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="size-10 rounded-full border-4 border-[var(--primary-9)] border-t-transparent animate-spin" />
                                    <motion.span
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="text-14 font-medium text-[var(--primary-11)]"
                                    >
                                        Analyzing Columns...                                    </motion.span>
                                </div>
                            </AnimateFadeIn>
                        )}
                    </div>
                </AnimateScale>

                {uploadedFile && (
                    <AnimateEntrancePop className="mt-6">
                        <Alert
                            text={`Selected File: ${uploadedFile.name} (${uploadedColumns.length} columns detected)`}
                            variant="green"
                        />
                    </AnimateEntrancePop>
                )}

                <footer className="flex items-center justify-end pt-6">
                    <button
                        onClick={onNext}
                        disabled={uploadState !== "ready"}
                        className={`
                            group flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-12 font-bold transition-all duration-200 
                            bg-[var(--primary-11)] text-white shadow-sm
                            ${uploadState !== "ready" ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[var(--primary-10)] hover:shadow-md active:scale-95"}                                          
                        `}
                    >
                        {uploadState === "parsing" ? "Processing..." : "Continue"}
                        <Icon
                            name="tabler:arrow-narrow-right"
                            className={`size-5 transition-transform duration-300 ${uploadState === "ready" ? "group-hover:translate-x-1" : "opacity-50"
                                }`}
                        />
                    </button>
                </footer>
            </AnimateSlideUp>
        </AnimateFadeIn>
    );
}