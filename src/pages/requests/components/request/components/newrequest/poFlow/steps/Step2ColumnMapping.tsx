import { useEffect } from "react";
import Icon from "@/components/base/icon/Icon";
import { Select, Divider } from "@mantine/core";
import {
    AnimateFadeIn,
    AnimateStagger,
} from "@/components/common/animations";
import { compareHeaderSimilarity } from "../utils/headerSimilarity";

type SystemCol = { key: string; required: boolean };

type Props = {
    systemColumns: SystemCol[];
    uploadedColumns: string[];
    mapping: Record<string, string>;
    setMapping: (m: Record<string, string>) => void;
    onBack: () => void;
    onNext: () => void;
};

export default function Step2ColumnMapping({
    systemColumns,
    uploadedColumns,
    mapping,
    setMapping,
    onBack,
    onNext,
}: Props) {

    // 1. Automatically run auto-map on mount
    useEffect(() => {
        const next: Record<string, string> = { ...mapping };
        let hasChanges = false;

        for (const col of systemColumns) {
            // Only auto-fill if not already mapped
            if (!next[col.key]) {
                const match = uploadedColumns.find((u) => compareHeaderSimilarity(u, col.key)); // Use the similarity function
                if (match) {
                    next[col.key] = match;
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            setMapping(next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Runs once on mount

    // Sort: Required fields first
    const sortedColumns = [...systemColumns].sort((a, b) => {
        if (a.required === b.required) return 0;
        return a.required ? -1 : 1;
    });

    const requiredTotal = systemColumns.filter((c) => c.required).length;
    const requiredMapped = systemColumns.filter((c) => c.required && !!mapping[c.key]).length;
    const isReady = requiredMapped === requiredTotal;

    const options = uploadedColumns.map((c) => ({ value: c, label: c }));

    return (
        <AnimateFadeIn className="flex flex-col h-[calc(100vh-250px)] max-w-4xl mx-auto w-full">
            <div className="flex flex-col h-full rounded-2xl border border-[var(--gray-3)] bg-[var(--gray-0)] shadow-sm overflow-hidden">

                {/* FIXED HEADER */}
                <div className="shrink-0 px-6 pt-5 pb-4 bg-[var(--gray-0)]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="text-lg font-semibold text-[var(--gray-13)]">Column Mapping</div>
                            <div className="mt-1 text-13 text-[var(--gray-10)]">
                                Align your file columns with Maseter Fields.
                            </div>
                        </div>

                        {/* Status Summary instead of buttons */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--gray-1)] border border-[var(--gray-3)]">
                            <span className="text-12 font-bold text-[var(--gray-12)]">
                                {requiredMapped} / {requiredTotal} Required
                            </span>
                        </div>
                    </div>

                    <Divider my="md" className="!border-[var(--gray-3)]" />

                    <div className="grid grid-cols-[1fr_40px_1fr] px-1 text-11 font-bold uppercase tracking-wider text-[var(--gray-9)]">
                        <div>Master Field</div>
                        <div />
                        <div>Source Field</div>
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar">
                    <AnimateStagger>
                        <div className="space-y-2">
                            {sortedColumns.map((col) => {
                                const selected = mapping[col.key] || "";
                                const isMapped = !!selected;
                                const isRequiredMissing = col.required && !isMapped;

                                return (
                                    <div
                                        key={col.key}
                                        className={[
                                            "grid grid-cols-[1fr_40px_1fr] items-center rounded-2xl border px-4 py-2 transition-all",
                                            isMapped
                                                ? "border-[var(--primary-3)] bg-[var(--gray-0)] shadow-sm"
                                                : isRequiredMissing
                                                    ? "border-[var(--red-3)] bg-[var(--red-0)]"
                                                    : "border-[var(--gray-3)] bg-[var(--gray-1)]",
                                        ].join(" ")}
                                    >
                                        {/* Field Name */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={[
                                                    "size-2 rounded-full shrink-0",
                                                    isMapped ? "bg-[var(--primary-8)]" : "bg-[var(--gray-5)]",
                                                ].join(" ")}
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-12 font-semibold text-[var(--gray-12)] truncate">
                                                        {col.key}
                                                    </span>
                                                    {col.required && (
                                                        <span className="inline-flex items-center rounded-md bg-[var(--red-2)] px-2 py-0.5 text-11 font-bold  text-[var(--red-9)]">
                                                            Required
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connector Icon */}
                                        <div className="flex justify-center text-[var(--gray-4)]">
                                            <Icon name="tabler:arrow-narrow-right" className="size-5" />
                                        </div>

                                        {/* Selection Dropdown */}
                                        <div className="flex items-center gap-2">
                                            <Select
                                                placeholder="Select a column…"
                                                data={options}
                                                searchable
                                                clearable
                                                nothingFoundMessage="No columns found"
                                                variant="unstyled"
                                                className={[
                                                    "w-full px-3 rounded-xl border transition-colors",
                                                    isMapped ? "border-[var(--primary-2)] bg-white" : "border-[var(--gray-3)] bg-white",
                                                ].join(" ")}
                                                styles={{
                                                    input: { fontSize: "12px", fontWeight: 600, height: "40px" },
                                                    dropdown: { borderRadius: "12px" },
                                                }}
                                                value={selected || null}
                                                onChange={(v) => setMapping({ ...mapping, [col.key]: v ?? "" })}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </AnimateStagger>
                </div>

                {/* FIXED FOOTER */}
                <div className="shrink-0 px-6 py-4 border-t border-[var(--gray-3)] bg-[var(--gray-0)]">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="group cursor-pointer inline-flex items-center gap-2 rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-2 py-2 text-12 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)] transition-colors"
                        >
                            <Icon name="tabler:chevron-left" className="size-5 transition-transform group-hover:-translate-x-1" />
                            Back
                        </button>

                        <div className="flex items-center gap-3">
                            {!isReady && (
                                <div className="hidden sm:flex items-center gap-2 text-12 font-medium text-[var(--red-10)]">
                                    <Icon name="tabler:info-circle" className="size-4" />
                                    Please map all required fields
                                </div>
                            )}

                            <button
                                onClick={onNext}
                                disabled={!isReady}
                                className={[
                                    "group inline-flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-12 font-bold text-white shadow-sm transition-all",
                                    isReady
                                        ? "bg-[var(--primary-11)] hover:bg-[var(--primary-10)] active:scale-95 cursor-pointer"
                                        : "bg-[var(--gray-7)] cursor-not-allowed opacity-70",
                                ].join(" ")}
                            >
                                Continue
                                <Icon
                                    name="tabler:chevron-right"
                                    className={`size-5 transition-transform ${isReady ? "group-hover:translate-x-1" : ""}`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AnimateFadeIn>
    );
}