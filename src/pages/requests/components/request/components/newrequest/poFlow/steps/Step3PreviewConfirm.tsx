import Icon from '@/components/base/icon/Icon'
import { AnimateSlideLeft } from '@/components/common/animations'
// import { useState } from 'react';

type SystemCol = { key: string; required: boolean }

type Props = {
    systemColumns: SystemCol[]
    mapping: Record<string, string>
    isSubmitting: boolean
    onBack: () => void
    onConfirm: () => void
    // setIsSubmitting: (isSubmitting: boolean) => void

    errors?: string[]
    warnings?: string[]

}

export default function Step3PreviewConfirm({
    systemColumns,
    mapping,
    onBack,
    onConfirm,
    isSubmitting,
    // setIsSubmitting
}: Props) {

    const rows = systemColumns.map((c) => ({
        systemField: c.key,
        required: c.required,
        uploadedColumn: mapping[c.key] || '',
    }))

    const mappedCount = rows.filter((r) => !!r.uploadedColumn).length
    const handleConfirmClick = () => {
        if (isSubmitting) return; // Prevent multiple submissions

        try {
            onConfirm(); // Call the parent function to process the confirmation
        } catch (error) {
            // Handle any errors if needed
            console.error(error);
        } finally {
            // setIsSubmitting(false); // Reset loading state after the process is done
        }
    };
    return (
        <div
            className={[
                // ✅ Fit into viewport
                'w-full max-w-full',
                'max-h-[calc(90vh-190px)]', // adjust offset if your page has bigger header
                'overflow-hidden',

                // ✅ Card styling
                'rounded-2xl border border-[var(--gray-3)] bg-[var(--gray-0)] shadow-sm',
                // ✅ Layout to allow internal scrolling
                'flex flex-col',
            ].join(' ')}
        >
            {/* Header (stays visible) */}
            <div className="p-5 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-18 font-semibold text-[var(--gray-13)]">Preview & Confirm</div>
                        <div className="mt-1 text-13 text-[var(--gray-10)]">
                            Review your mapping, verify warnings, and confirm to proceed.
                        </div>
                    </div>

                    <div
                        className={[
                            'shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-12 font-semibold',
                            'bg-[var(--green-2)] text-[var(--green-9)]',
                        ].join(' ')}
                    >
                        <Icon name="tabler:circle-check" className="size-4" />
                        Ready to confirm
                    </div>
                </div>
            </div>

            {/* Content area (scrolls if needed) */}
            <div className="px-5 pb-5 flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
                {/* Mapping preview */}
                <div className="rounded-2xl border border-[var(--gray-3)] overflow-hidden flex flex-col min-h-0">
                    <div className="flex items-center justify-between bg-[var(--gray-1)] px-4 py-3 shrink-0">
                        <div className="text-13 font-semibold text-[var(--gray-12)]">Mapping Summary</div>
                        <div className="text-12 text-[var(--gray-10)]">
                            {mappedCount}/{rows.length} fields mapped
                        </div>
                    </div>

                    {/* ✅ This becomes the scrolling region */}
                    <div className="flex-1 min-h-0 overflow-auto">
                        <div className="min-w-full overflow-x-auto">
                            <AnimateSlideLeft>
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 bg-[var(--gray-0)] z-10">
                                        <tr className="border-b border-[var(--gray-3)]">
                                            <th className="text-left px-4 py-2 text-12 font-semibold text-[var(--gray-11)]">
                                                Master Field
                                            </th>
                                            <th className="text-left px-4 py-2 text-12 font-semibold text-[var(--gray-11)]">
                                                Mapped Source
                                            </th>
                                            <th className="text-right px-4 py-2 text-12 font-semibold text-[var(--gray-11)]">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rows.map((r) => {
                                            const missing = !r.uploadedColumn
                                            return (
                                                <tr key={r.systemField} className="border-b border-[var(--gray-2)]">
                                                    <td className="px-4 py-3 text-13 font-medium text-[var(--gray-12)]">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="truncate">{r.systemField}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-13 text-[var(--gray-12)]">
                                                        {missing ? (
                                                            <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--red-2)] px-2 py-1 text-12 font-semibold text-[var(--red-9)]">
                                                                Not mapped
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--green-2)] px-2 py-1 text-12 font-semibold text-[var(--green-11)]">
                                                                <span className="truncate max-w-[320px]">{r.uploadedColumn}</span>
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
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </AnimateSlideLeft>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions (stays visible) */}
            <div className="px-5 pb-5 shrink-0">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="group cursor-pointer inline-flex items-center gap-2 rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-2 py-2 text-12 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)] transition-colors"
                    >
                        <Icon name="tabler:chevron-left" className="size-5 transition-transform group-hover:-translate-x-1" />
                        Back
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirmClick}
                        disabled={isSubmitting}
                        className={[
                            'rounded-xl px-4 py-2 text-13 font-semibold text-white shadow-sm flex items-center gap-2',
                            'bg-[var(--primary-9)] hover:bg-[var(--primary-10)] cursor-pointer',
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
                        ].join(' ')}
                    // title="Confirm and proceed"
                    >
                        {isSubmitting ? (
                            <>
                                <Icon name="tabler:loader" className="size-4 animate-spin" />
                                <span>Please Wait...</span>
                            </>
                        ) : (
                            <>
                                {/* Added Icon here */}
                                <Icon name="tabler:circle-dashed-check" className="size-5" />
                                <span>Confirm and Submit</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div >
    )
}
