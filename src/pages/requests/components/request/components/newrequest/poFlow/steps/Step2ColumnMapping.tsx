import { useEffect } from "react";
import { Select } from "@mantine/core";
import Icon from "@/components/base/icon/Icon";
import {
    AnimateFadeIn
} from "@/components/common/animations";
import { compareHeaderSimilarity } from "../utils/headerSimilarity";
import cn from "@/utils/cn";

type SystemCol = { key: string; required: boolean };

type Props = {
    systemColumns: SystemCol[];
    uploadedColumns: string[];
    mapping: Record<string, string>;
    setMapping: (m: Record<string, string>) => void;
    onBack?: () => void;
    onNext?: () => void;
};

export default function Step2ColumnMapping({
    systemColumns,
    uploadedColumns,
    mapping,
    setMapping
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
    // const isReady = requiredMapped === requiredTotal;

    const options = uploadedColumns.map((c) => ({ value: c, label: c }));

    return (
        <AnimateFadeIn className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-13">Column Mapping</h2>
                    <p className="mt-0.5 text-xs font-medium text-gray-11">
                        Align your file columns with Master Fields to ensure accurate data processing.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-secondary border border-gray-3 shadow-sm">
                    <span className="text-xs font-bold text-gray-11">
                        {requiredMapped} / {requiredTotal} Required Mapped
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-[1fr_40px_1fr] px-4 text-[10px] font-bold uppercase tracking-wider text-gray-10">
                <div>Master Field</div>
                <div />
                <div>Source Field</div>
            </div>

            <div className="space-y-2">
                {sortedColumns.map((col) => {
                    const selected = mapping[col.key] || "";
                    const isMapped = !!selected;
                    const isRequiredMissing = col.required && !isMapped;

                    return (
                        <div
                            key={col.key}
                            className={cn(
                                "grid grid-cols-[1fr_40px_1fr] items-center rounded-xl border px-4 py-2.5 transition-all duration-300",
                                isMapped
                                    ? "border-[var(--primary-3)] bg-surface-primary shadow-sm"
                                    : isRequiredMissing
                                        ? "border-error-subtle bg-error-subtle/20"
                                        : "border-gray-3 bg-surface-secondary/30",
                            )}
                        >
                            {/* Field Name */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className={cn(
                                        "size-2 rounded-full shrink-0 transition-colors duration-300",
                                        isMapped ? "bg-primary-9" : "bg-gray-5",
                                    )}
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm font-semibold text-gray-13 truncate">
                                            {col.key}
                                        </span>
                                        {col.required && (
                                            <span className="inline-flex items-center rounded-full bg-error-subtle px-2 py-0.5 text-[10px] font-bold uppercase text-error-main tracking-wider">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Connector Icon */}
                            <div className="flex justify-center text-gray-5">
                                <Icon name="tabler:arrow-right" className="size-4" />
                            </div>

                            {/* Selection Dropdown */}
                            <div className="flex items-center">
                                <Select
                                    placeholder="Select a column…"
                                    data={options}
                                    searchable
                                    clearable
                                    nothingFoundMessage="No columns found"
                                    variant="unstyled"
                                    className={cn(
                                        "w-full px-3 rounded-lg border transition-all duration-300",
                                        isMapped ? "border-primary-9 bg-surface-primary ring-2 ring-primary-9/5" : "border-gray-4 bg-surface-primary hover:border-gray-5",
                                    )}
                                    styles={{
                                        input: { fontSize: "13px", fontWeight: 500, height: "40px" },
                                        dropdown: { borderRadius: "12px", border: '1px solid var(--gray-3)', boxShadow: 'var(--shadow-md)' },
                                    }}
                                    value={selected || null}
                                    onChange={(v: any) => setMapping({ ...mapping, [col.key]: v ?? "" })}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </AnimateFadeIn>
    )
}