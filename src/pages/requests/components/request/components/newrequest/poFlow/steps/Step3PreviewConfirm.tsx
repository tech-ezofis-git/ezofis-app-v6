import Icon from "@/components/base/icon/Icon";

type SystemCol = { key: string; required: boolean };

type Props = {
    systemColumns: SystemCol[];
    mapping: Record<string, string>;
    errors: string[];
    warnings: string[];
    onBack: () => void;
    onConfirm: () => void;
};

export default function Step3PreviewConfirm({
    systemColumns,
    mapping,
    errors,
    warnings,
    onBack,
    onConfirm
}: Props) {
    const rows = systemColumns.map((c) => ({
        systemField: c.key,
        required: c.required,
        uploadedColumn: mapping[c.key] || ""
    }));

    const mappedCount = rows.filter((r) => !!r.uploadedColumn).length;

    const hasErrors = (errors?.length ?? 0) > 0;
    const hasWarnings = (warnings?.length ?? 0) > 0;

    return (
        <div className="rounded-2xl border border-[var(--gray-3)] bg-[var(--gray-0)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-18 font-semibold text-[var(--gray-13)]">Preview & Confirm</div>
                    <div className="mt-1 text-13 text-[var(--gray-10)]">
                        Review your mapping, verify warnings, and confirm to proceed.
                    </div>
                </div>

                <div
                    className={[
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-12 font-semibold",
                        hasErrors
                            ? "bg-[var(--red-2)] text-[var(--red-9)]"
                            : hasWarnings
                                ? "bg-[var(--yellow-2)] text-[var(--yellow-9)]"
                                : "bg-[var(--green-2)] text-[var(--green-9)]"
                    ].join(" ")}
                >
                    <Icon
                        name={hasErrors ? "tabler:alert-triangle" : hasWarnings ? "tabler:alert-circle" : "tabler:circle-check"}
                        className="size-4"
                    />
                    {hasErrors ? "Action required" : hasWarnings ? "Review warnings" : "Ready to confirm"}
                </div>
            </div>

            {/* Errors */}
            {hasErrors ? (
                <div className="mt-5 rounded-2xl border border-[var(--red-3)] bg-[var(--red-1)] p-4">
                    <div className="flex items-center gap-2 text-13 font-semibold text-[var(--red-9)]">
                        <Icon name="tabler:alert-triangle" className="size-4" />
                        Errors
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-12 text-[var(--red-10)]">
                        {errors.map((e, idx) => (
                            <li key={idx}>{e}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Warnings */}
            {hasWarnings ? (
                <div className="mt-3 rounded-2xl border border-[var(--yellow-3)] bg-[var(--yellow-1)] p-4">
                    <div className="flex items-center gap-2 text-13 font-semibold text-[var(--yellow-9)]">
                        <Icon name="tabler:alert-circle" className="size-4" />
                        Warnings
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-12 text-[var(--yellow-10)]">
                        {warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Mapping preview */}
            <div className="mt-5 rounded-2xl border border-[var(--gray-3)] overflow-hidden">
                <div className="flex items-center justify-between bg-[var(--gray-1)] px-4 py-3">
                    <div className="text-13 font-semibold text-[var(--gray-12)]">Mapping Summary</div>
                    <div className="text-12 text-[var(--gray-10)]">
                        {mappedCount}/{rows.length} fields mapped
                    </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-[var(--gray-0)]">
                            <tr className="border-b border-[var(--gray-3)]">
                                <th className="text-left px-4 py-2 text-12 font-semibold text-[var(--gray-11)]">System Field</th>
                                <th className="text-left px-4 py-2 text-12 font-semibold text-[var(--gray-11)]">Uploaded Column</th>
                                <th className="text-right px-4 py-2 text-12 font-semibold text-[var(--gray-11)]">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((r) => {
                                const missing = !r.uploadedColumn;
                                return (
                                    <tr key={r.systemField} className="border-b border-[var(--gray-2)]">
                                        <td className="px-4 py-3 text-13 font-medium text-[var(--gray-12)]">
                                            <div className="flex items-center gap-2">
                                                <span>{r.systemField}</span>
                                                {/* {r.required ? (
                                                    <span className="rounded-md bg-[var(--red-2)] px-2 py-0.5 text-11 font-semibold text-[var(--red-9)]">
                                                        Required
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-[var(--gray-2)] px-2 py-0.5 text-11 font-semibold text-[var(--gray-10)]">
                                                        Optional
                                                    </span>
                                                )} */}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-13 text-[var(--gray-12)]">
                                            {missing ? (
                                                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--red-2)] px-2 py-1 text-12 font-semibold text-[var(--red-9)]">
                                                    Not mapped
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--green-2)] px-2 py-1 text-12 font-semibold text-[var(--green-11)]">
                                                    {r.uploadedColumn}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            {missing ? (
                                                <span className="text-12 font-semibold text-[var(--red-9)]">
                                                    <Icon name="tabler:x" className="size-4 inline" />
                                                </span>
                                            ) : (
                                                <span className="text-12 font-semibold text-[var(--green-9)]">
                                                    <Icon name="tabler:check" className="size-4 inline" />
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="cursor-pointer rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-4 py-2 text-13 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)]"
                >
                    Back
                </button>

                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={hasErrors}
                    className={[
                        "rounded-xl px-4 py-2 text-13 font-semibold text-white shadow-sm",
                        hasErrors ? "bg-[var(--gray-7)] cursor-not-allowed opacity-70" : "bg-[var(--primary-9)] hover:bg-[var(--primary-10)] cursor-pointer"
                    ].join(" ")}
                    title={hasErrors ? "Fix errors before confirming" : "Confirm and proceed"}
                >
                    Confirm
                </button>
            </div>
        </div>
    );
}
