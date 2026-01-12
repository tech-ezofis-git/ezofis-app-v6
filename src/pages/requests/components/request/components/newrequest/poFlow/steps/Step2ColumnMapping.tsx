import Icon from "@/components/base/icon/Icon";
import { Select, Divider, Tooltip } from "@mantine/core";
import {
    AnimateFadeIn,
    AnimateStagger,
} from "@/components/common/animations";

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
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

    const requiredTotal = systemColumns.filter((c) => c.required).length;
    const requiredMapped = systemColumns.filter((c) => c.required && !!mapping[c.key]).length;

    const totalMapped = systemColumns.filter((c) => !!mapping[c.key]).length;
    const isReady = requiredMapped === requiredTotal;

    const hasAnyMapping = totalMapped > 0;

    const runAutoMap = () => {
        const next: Record<string, string> = { ...mapping };
        for (const col of systemColumns) {
            if (next[col.key]) continue;
            const match = uploadedColumns.find((u) => normalize(u) === normalize(col.key));
            if (match) next[col.key] = match;
        }
        setMapping(next);
    };

    const clearAll = () => {
        const next: Record<string, string> = {};
        for (const col of systemColumns) next[col.key] = "";
        setMapping(next);
    };

    const options = uploadedColumns.map((c) => ({ value: c, label: c }));

    // const status = isReady
    //     ? { label: "Ready to continue", icon: "tabler:circle-check", cls: "bg-[var(--green-2)] text-[var(--green-9)]" }
    //     : requiredMapped === 0
    //         ? { label: "Map required fields", icon: "tabler:alert-circle", cls: "bg-[var(--yellow-2)] text-[var(--yellow-9)]" }
    //         : { label: "Almost there", icon: "tabler:progress-check", cls: "bg-[var(--blue-2)] text-[var(--blue-9)]" };

    return (
        <AnimateFadeIn className="flex flex-col h-[calc(100vh-250px)] max-w-4xl mx-auto w-full">
            {/* CARD SHELL (Aligned with Step 3) */}
            <div className="flex flex-col h-full rounded-2xl border border-[var(--gray-3)] bg-[var(--gray-0)] shadow-sm overflow-hidden">
                {/* FIXED HEADER */}
                <div className="shrink-0 px-6 pt-5 pb-4 bg-[var(--gray-0)]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="text-18 font-semibold text-[var(--gray-13)]">Column Mapping</div>
                            <div className="mt-1 text-13 text-[var(--gray-10)]">
                                Align your uploaded columns to system fields.
                            </div>

                            {/* <div className="mt-3 flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-12 font-semibold bg-[var(--gray-1)] text-[var(--gray-12)] border border-[var(--gray-3)]">
                                    <Icon name="tabler:table" className="size-4" />
                                    {totalMapped}/{systemColumns.length} mapped
                                </div>

                                <div
                                    className={[
                                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-12 font-semibold border",
                                        isReady
                                            ? "bg-[var(--green-1)] text-[var(--green-9)] border-[var(--green-3)]"
                                            : "bg-[var(--yellow-1)] text-[var(--yellow-9)] border-[var(--yellow-3)]",
                                    ].join(" ")}
                                >
                                    <Icon name={isReady ? "tabler:circle-check" : "tabler:asterisk"} className="size-4" />
                                    {requiredMapped}/{requiredTotal} required mapped
                                </div>

                                <div className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-12 font-semibold", status.cls].join(" ")}>
                                    <Icon name={status.icon} className="size-4" />
                                    {status.label}
                                </div>
                            </div> */}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Tooltip label="Auto-map columns with exact name match" withArrow>
                                <button
                                    type="button"
                                    onClick={runAutoMap}
                                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[var(--primary-1)] px-4 py-2 text-13 font-bold text-[var(--primary-9)] border border-[var(--primary-2)] hover:bg-[var(--primary-2)] transition-colors"
                                >
                                    <Icon name="tabler:wand" className="size-4" />
                                    Auto-fill
                                </button>
                            </Tooltip>

                            <Tooltip label="Clear all mappings" withArrow>
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    disabled={!hasAnyMapping}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-xl px-2 py-2 text-13 font-bold border transition-colors",
                                        hasAnyMapping
                                            ? "cursor-pointer bg-[var(--gray-0)] text-[var(--gray-12)] border-[var(--gray-4)] hover:bg-[var(--gray-1)]"
                                            : "cursor-not-allowed opacity-60 bg-[var(--gray-0)] text-[var(--gray-10)] border-[var(--gray-3)]",
                                    ].join(" ")}
                                >
                                    <Icon name="tabler:eraser" className="size-4" />
                                    {/* Clear */}
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    <Divider my="md" className="!border-[var(--gray-3)]" />

                    {/* TABLE HEADER */}
                    <div className="grid grid-cols-[1fr_40px_1fr] px-1 text-11 font-bold uppercase tracking-wider text-[var(--gray-9)]">
                        <div>System Field</div>
                        <div></div>
                        <div>Your File Column</div>
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar">
                    <AnimateStagger>
                        <div className="space-y-2">
                            {systemColumns.map((col) => {
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
                                                    isMapped
                                                        ? "bg-[var(--primary-8)]"
                                                        : "bg-[var(--gray-5)]",
                                                ].join(" ")}
                                            />

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-12 font-semibold text-[var(--gray-12)] truncate">
                                                        {col.key}
                                                    </span>
                                                    {col.required ? (
                                                        <span className="inline-flex items-center rounded-md     px-2 py-0.5 text-11 font-semibold text-[var(--red-9)]">
                                                            *
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-md bg-[var(--gray-2)] px-2 py-0.5 text-11 font-semibold text-[var(--gray-10)]">

                                                        </span>
                                                    )}
                                                </div>

                                                {isRequiredMissing ? (
                                                    // <div className="mt-0.5 text-12 text-[var(--red-10)]">
                                                    //     This field is required to continue.
                                                    // </div>
                                                    <></>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Arrow Icon */}
                                        <div className="flex justify-center text-[var(--gray-4)]">
                                            <Icon name="tabler:arrow-narrow-right" className="size-5" />
                                        </div>

                                        {/* Selection */}
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
                                                    isMapped
                                                        ? "border-[var(--primary-2)] bg-white"
                                                        : isRequiredMissing
                                                            ? "border-[var(--red-3)] bg-white"
                                                            : "border-[var(--gray-3)] bg-white",
                                                ].join(" ")}
                                                styles={{
                                                    input: {
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        height: "40px",
                                                        paddingLeft: "6px",
                                                        paddingRight: "6px",
                                                    },
                                                    dropdown: {
                                                        borderRadius: "12px",
                                                        overflow: "hidden",
                                                    },
                                                }}
                                                value={selected || null}
                                                onChange={(v) => setMapping({ ...mapping, [col.key]: v ?? "" })}
                                            />

                                            {/* {isMapped ? (
                                                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--green-2)] px-2 py-1 text-12 font-semibold text-[var(--green-10)] shrink-0">
                                                    <Icon name="tabler:check" className="size-4" />
                                                    Mapped
                                                </span>
                                            ) : (
                                                <span
                                                    className={[
                                                        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-12 font-semibold shrink-0",
                                                        col.required
                                                            ? "bg-[var(--red-2)] text-[var(--red-9)]"
                                                            : "bg-[var(--gray-2)] text-[var(--gray-10)]",
                                                    ].join(" ")}
                                                >
                                                    <Icon name={col.required ? "tabler:alert-triangle" : "tabler:minus"} className="size-4" />
                                                    {col.required ? "Missing" : "Skip"}
                                                </span>
                                            )} */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </AnimateStagger>
                </div>

                {/* FIXED FOOTER (Aligned with Step 3) */}
                <div className="shrink-0 px-6 py-4 border-t border-[var(--gray-3)] bg-[var(--gray-0)]">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-4 py-2 text-13 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)] transition-colors"
                        >
                            {/* <Icon name="tabler:arrow-left" className="size-4" /> */}
                            Back
                        </button>

                        <div className="flex items-center gap-3">
                            {!isReady ? (
                                <div className="hidden sm:flex items-center gap-2 text-12 text-[var(--red-10)]">
                                    <Icon name="tabler:info-circle" className="size-4" />
                                    Map all required fields to proceed.
                                </div>
                            ) : null}

                            <button
                                onClick={onNext}
                                disabled={!isReady}
                                className={[
                                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-13 font-semibold text-white shadow-sm transition-all",
                                    isReady
                                        ? "bg-[var(--primary-9)] hover:bg-[var(--primary-10)] active:scale-95 cursor-pointer"
                                        : "bg-[var(--gray-7)] cursor-not-allowed opacity-70",
                                ].join(" ")}
                                title={!isReady ? "Map all required fields to continue" : "Continue to review"}
                            >
                                Continue
                                {/* <Icon name="tabler:chevron-right" className="size-4" /> */}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AnimateFadeIn>
    );
}
