import Icon from '@/components/base/icon/Icon'
import { AnimateSlideLeft } from '@/components/common/animations'
import cn from '@/utils/cn'

type SystemCol = { key: string; required: boolean }

type Props = {
    systemColumns: SystemCol[]
    mapping: Record<string, string>
    isSubmitting?: boolean
    onBack?: () => void
    onConfirm?: () => void
    // setIsSubmitting: (isSubmitting: boolean) => void

    errors?: string[]
    warnings?: string[]

}

export default function Step3PreviewConfirm({
    systemColumns,
    mapping
}: Props) {

    const rows = systemColumns.map((c) => ({
        systemField: c.key,
        required: c.required,
        uploadedColumn: mapping[c.key] || '',
    }))

    const mappedCount = rows.filter((r) => !!r.uploadedColumn).length
    return (
        <AnimateSlideLeft className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-13">Review & Confirm</h2>
                    <p className="mt-0.5 text-xs font-medium text-gray-11">
                        Review your column mapping summary before finalizing the PO configuration.
                    </p>
                </div>

                <div
                    className={cn(
                        'shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-sm',
                        'bg-[var(--green-2)] text-[var(--green-9)]',
                    )}
                >
                    <Icon name="tabler:circle-check" className="size-4" />
                    Ready to confirm
                </div>
            </div>

            <div className="rounded-2xl border border-gray-3 bg-surface-primary shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-surface-secondary/50 px-4 py-3 border-b border-gray-3">
                    <div className="text-xs font-bold text-gray-13">Mapping Summary</div>
                    <div className="text-[10px] font-bold text-gray-10 uppercase tracking-wider">
                        {mappedCount}/{rows.length} fields mapped
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-surface-secondary/30">
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-10 uppercase tracking-wider border-b border-gray-3">
                                    Master Field
                                </th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-10 uppercase tracking-wider border-b border-gray-3">
                                    Mapped Source
                                </th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-gray-10 uppercase tracking-wider border-b border-gray-3">
                                    Status
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((r) => {
                                const missing = !r.uploadedColumn
                                return (
                                    <tr key={r.systemField} className="hover:bg-surface-secondary/50 transition-colors">
                                        <td className="px-4 py-2.5 border-b border-gray-2 last:border-0">
                                            <span className="text-sm font-semibold text-gray-13">{r.systemField}</span>
                                            {r.required && (
                                                <span className="ml-2 text-[10px] text-error-main font-bold uppercase tracking-tight">Required</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-2.5 border-b border-gray-2 last:border-0">
                                            {missing ? (
                                                <span className="inline-flex items-center rounded-lg bg-error-subtle px-2 py-0.5 text-[10px] font-bold text-error-main uppercase tracking-wider">
                                                    Not mapped
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-lg bg-primary-9/10 px-2 py-0.5 text-[10px] font-bold text-primary-11">
                                                    {r.uploadedColumn}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-2.5 text-right border-b border-gray-2 last:border-0">
                                            {missing ? (
                                                <Icon name="tabler:alert-circle" className="size-4 text-[var(--red-9)] inline" />
                                            ) : (
                                                <Icon name="tabler:circle-check" className="size-4 text-[var(--green-9)] inline" />
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AnimateSlideLeft>
    )
}
