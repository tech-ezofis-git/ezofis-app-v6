import React, { useEffect, useMemo } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import { useDynamicColumns } from './columns/useDynamicColumns'
import type { WorkflowOption, TableGroup } from '../types'
import Request from './request/Request'
import { motion } from 'motion/react'
import GridView from './GridView'

import { AnimateFadeIn } from '@/components/common/animations'
import requestStore from '../stores/useRequestStore'
import TableActionBar, { type TableActionButton } from '@/components/base/data-table/TableActionBar'
// import { getGroupedRowModel } from '@tanstack/react-table'
const hideRootGroupStyle = `
  .hide-root-header tbody > tr:first-child {
    display: none !important;
  }
`

interface InboxListProps {
    workflow: WorkflowOption | null
    data: TableGroup[]
    totalItems: number
    isLoading: boolean
    isRefetching: boolean
    page: number
    pageSize: number
    setPage: (p: number) => void
    setPageSize: (s: number) => void
    onRefresh: () => void
    onRowClick: (item: any, tab: string) => void
    selectedItem: any
    setSelectedItem: (item: any) => void
    viewMode: 'table' | 'grid'
}

// ✅ robust flattener for your backend shape (group.items)
function flattenRows(groups: any[]): any[] {
    const out: any[] = []

    const walk = (node: any) => {
        if (!node) return

        // Your shape: group has items: []
        if (Array.isArray(node.items)) {
            out.push(...node.items)
        }

        // Future-proof: some APIs use value/rows
        if (Array.isArray(node.value)) {
            out.push(...node.value)
        }
        if (Array.isArray(node.rows)) {
            out.push(...node.rows)
        }

        // Nested groups (if any)
        if (Array.isArray(node.children)) {
            node.children.forEach(walk)
        }
        if (Array.isArray(node.groups)) {
            node.groups.forEach(walk)
        }
    }

        ; (groups || []).forEach(walk)
    return out
}

const InboxList: React.FC<InboxListProps> = ({
    workflow,
    data,
    totalItems,
    isLoading,
    isRefetching,
    page,
    pageSize,
    setPage,
    setPageSize,
    onRefresh,
    onRowClick,
    selectedItem,
    setSelectedItem,
    viewMode,
}) => {
    const { openNewRequest } = requestStore((state) => state)
    const columns = useDynamicColumns(workflow, onRowClick, selectedItem) || []

    console.log(data, "this is from inbox list")
    const initialVisibilityState = {
        createdAt: false,
        createdBy: false,
        updatedAt: false,
        updatedBy: false,
    }

    const { expandState, groupState, sortState, setExpandState, ...rest } = useDataTableState({
        initialVisibilityState,
    })

    // Auto-expand root group
    useEffect(() => {
        setExpandState({ root: true })
    }, [setExpandState])

    const { table } = useDataTable({
        columns,
        rows: (data || []) as any,
        enableRowSelection: false,

        state: { expandState, groupState, sortState, setExpandState, ...rest },
    })

    // ✅ Use your actual API shape: data[0].items etc.
    const flatRows = useMemo(() => flattenRows(data as any), [data])

    // ✅ index of currently opened item in the flattened list
    const selectedIndex = useMemo(() => {
        if (!selectedItem) return -1

        const selTid = selectedItem?.transactionId != null ? String(selectedItem.transactionId) : ''
        const selPid = selectedItem?.processId != null ? String(selectedItem.processId) : ''
        const selId = selectedItem?.id != null ? String(selectedItem.id) : ''

        return flatRows.findIndex((r: any) => {
            const rTid = r?.transactionId != null ? String(r.transactionId) : ''
            const rPid = r?.processId != null ? String(r.processId) : ''
            const rId = r?.id != null ? String(r.id) : ''

            // strongest match first
            if (selTid && rTid) return selTid === rTid
            if (selPid && rPid) return selPid === rPid
            if (selId && rId) return selId === rId

            // extra fallback (optional)
            if (selectedItem?.requestNo && r?.requestNo) return String(selectedItem.requestNo) === String(r.requestNo)

            return false
        })
    }, [flatRows, selectedItem])

    const hasPrev = selectedIndex > 0
    const hasNext = selectedIndex >= 0 && selectedIndex < flatRows.length - 1

    const goToRow = (row: any) => {
        if (!row) return
        setSelectedItem(row)        // keep RequestsPage selectedItem in sync
        onRowClick(row, 'Overview') // triggers openRequest(row, workflow, tab)
    }

    const onPrev = () => {
        if (!hasPrev) return
        goToRow(flatRows[selectedIndex - 1])
    }

    const onNext = () => {
        if (!hasNext) return
        goToRow(flatRows[selectedIndex + 1])
    }

    // Debug (keep for a bit until stable)
    // console.log({ selectedIndex, hasPrev, hasNext, flatRowsLen: flatRows.length, selectedItem }, 'nav-debug')
    const handlePoSheet = () => {
        // alert("hi")
        openNewRequest("po")
    }
    return (
        <>
            <style>{hideRootGroupStyle}</style>

            <div className="flex flex-col bg-primary px-6 md:px-6 py-2">
                <div className="flex-1  hide-root-header relative">
                    <div className="flex w-full gap-3">
                        {/* Left */}
                        {!selectedItem && viewMode === 'table' && (
                            <div className="basis-5/5 p-2 py-2 min-w-0">
                                <DataTable
                                    isLoading={isLoading}
                                    isReLoading={isRefetching}
                                    pageSize={pageSize}
                                    table={table}
                                    onReload={onRefresh}
                                    component={selectedItem}
                                    actions={[
                                        {
                                            label: 'Upload PO',
                                            onClick: () => { handlePoSheet() },
                                            icon: 'tabler:upload',
                                            align: 'right', // or 'left'
                                        },
                                    ]}
                                />
                            </div>
                        )}

                        {!selectedItem && viewMode === 'grid' && (
                            <div className="basis-5/5 min-w-0">

                                <GridView
                                    table={table} // Pass the instance
                                    data={data} // Or table.getRowModel().rows.map(r => r.original)
                                    isLoading={isLoading}
                                    isReloading={isRefetching}
                                    onReload={onRefresh}
                                    onRowClick={onRowClick}

                                    actions={[
                                        {
                                            label: 'Upload PO',
                                            onClick: () => { handlePoSheet() },
                                            icon: 'tabler:upload',
                                            align: 'right',
                                        },
                                    ]}
                                />
                            </div>
                        )}

                        {/* Right */}
                        {selectedItem && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="basis-5/5 min-w-0 h-[calc(100vh-160px)]"
                            >
                                <AnimateFadeIn>
                                    <Request
                                        onPrev={hasPrev ? onPrev : undefined}
                                        onNext={hasNext ? onNext : undefined}
                                    />
                                </AnimateFadeIn>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                {!selectedItem && (
                    <div className="p-4 shrink-0 bg-primary-1 z-10">
                        <Pagination
                            itemLabel="Requests"
                            page={page}
                            pageSize={pageSize}
                            totalItems={totalItems}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            showPageNumbers={false}
                        />
                    </div>
                )}
            </div>
        </>
    )
}

export default InboxList
