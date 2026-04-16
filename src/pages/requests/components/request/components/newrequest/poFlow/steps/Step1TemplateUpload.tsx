import { useRef, useState } from "react";
import Icon from "@/components/base/icon/Icon";
import { downloadTemplate, PO_ACCEPT } from "../../utils";
import authUserStore from "../../../../../../../../stores/authUserStore";
import showToast from "@/components/base/toast/showToast";
import type { UploadState } from "../PoSetupFlowPage";
import cn from "@/utils/cn";

import {
    AnimateFadeIn,
    AnimateEntrancePop
} from "@/components/common/animations";

import Papa from "papaparse";
import * as XLSX from "xlsx";

type Props = {
    uploadState: UploadState;
    setUploadState: (s: UploadState) => void;
    uploadedFile: File | null;
    rowCount: number | null;
    setUploadedFile: (f: File | null) => void;
    uploadedColumns: string[];
    setUploadedColumns: (c: string[]) => void;
    setRowCount: (n: number | null) => void;
    onNext: () => void;
};

async function extractHeadersAndData(file: File): Promise<{ headers: string[], rowCount: number }> {
    const name = file.name.toLowerCase();

    const parseCsv = async (csvFileOrText: File | string): Promise<{ headers: string[], rowCount: number }> => {
        return new Promise((resolve, reject) => {
            Papa.parse(csvFileOrText as any, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const fields = (results.meta?.fields ?? []).map(normalizeHeader).filter(Boolean);
                    const rowCount = results.data.length; // Count rows of data

                    if (!fields.length) reject(new Error("No header row found in CSV."));
                    else resolve({ headers: fields, rowCount });
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
            const rowCount = rows.length - 1; // Subtract 1 to exclude header row

            return { headers, rowCount };
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
    rowCount,
    setRowCount,
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

            const response = await extractHeadersAndData(file);
            console.log("Extracted Data:", response);
            setUploadedColumns(response?.headers);

            setRowCount(response?.rowCount);
            showToast({ message: `Detected ${response?.headers.length} columns and ${response?.rowCount} records`, variant: "success" });
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
            {/* Step Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-13">Upload Purchase Order</h2>
                    <p className="text-gray-11 text-xs font-medium mt-0.5">Please upload your PO data file (CSV or XLSX) to begin the configuration.</p>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-3 rounded-full text-xs font-bold text-gray-11 hover:bg-surface-secondary transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDownloading ? (
                        <span className="size-3 border-2 border-gray-10 bg-warning-6 border-t-transparent animate-spin rounded-full" />
                    ) : (
                        <Icon name="tabler:download" className="text-base" />
                    )}
                    {isDownloading ? "Preparing..." : "Download Template"}
                </button>
            </div>

            {/* Upload Zone */}
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-3xl p-10 text-center transition-all group bg-surface-secondary/30",
                    isDragOver
                        ? "border-primary-9 bg-primary-1/10"
                        : "border-gray-3 hover:border-primary-9/50"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    onFileChange(e.dataTransfer.files?.[0]);
                }}
            >
                <div className="flex flex-col items-center">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 bg-primary-9/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform cursor-pointer"
                    >
                        <Icon name="tabler:file-upload" className="text-primary-9 text-3xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-13 mb-1">
                        Drop your PO file here, or <button onClick={() => fileInputRef.current?.click()} className="text-primary-9 hover:underline font-bold">browse</button>
                    </h3>
                    <p className="text-xs text-gray-10 mb-6 font-medium">Accepted formats: CSV, XLSX</p>

                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-6 border border-gray-2 rounded-xl shadow-xs">
                            <Icon name="tabler:file-type-csv" className="text-black-5 text-lg" />
                            <span className="text-[10px] font-bold text-black-5 tracking-wider">CSV</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-secondary-5 border border-gray-2 rounded-xl shadow-xs">
                            <Icon name="tabler:file-type-xls" className="text-black-5 text-lg" />
                            <span className="text-[10px] font-bold text-black-5 tracking-wider">XLSX</span>
                        </div>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept={PO_ACCEPT}
                    onChange={(e) => onFileChange(e.target.files?.[0])}
                />

                {/* Parsing Overlay */}
                {(uploadState === "parsing") && (
                    <AnimateFadeIn className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-surface-primary/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <span className="size-8 rounded-full border-4 border-primary-9 border-t-transparent animate-spin" />
                            <span className="text-xs font-bold text-primary-11 animate-pulse">
                                Analyzing Columns...
                            </span>
                        </div>
                    </AnimateFadeIn>
                )}
            </div>

            {uploadedFile && (
                <AnimateEntrancePop>
                    <div className="flex items-center gap-3 p-3 bg-success-subtle/40 border border-success-subtle rounded-2xl">
                        <Icon name="tabler:circle-check" className="text-success-main size-5" />
                        <div>
                            <p className="text-xs font-bold text-success-main">File Selected</p>
                            <p className="text-[10px] font-medium text-success-main/70">
                                {uploadedFile.name} • {uploadedColumns.length} columns • {rowCount} records
                            </p>
                        </div>
                    </div>
                </AnimateEntrancePop>
            )}
        </AnimateFadeIn>
    );
}