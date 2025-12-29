import React, { useEffect } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import { useDynamicColumns } from './columns/useDynamicColumns'
import type { WorkflowOption, TableGroup } from '../types'

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
}) => {
    const columns = useDynamicColumns(workflow, onRowClick) || []
    console.log("InboxList rendered", columns)
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
        setExpandState({ root: true });
    }, [setExpandState])

    const { table } = useDataTable({
        columns,
        rows: (data || []) as any,
        enableRowSelection: false,
        state: { expandState, groupState, sortState, setExpandState, ...rest },

    })

    return (
        <>
            <style>{hideRootGroupStyle}</style>

            <div className='flex flex-col rounded-lg bg-primary shadow  px-6 md:px-6 py-4'>
                {/* Header */}
                {/* <div className='flex items-center justify-between border-b p-4 shrink-0'>
                    <h2 className='text-lg font-semibold text-gray-800'>
                        {workflow?.name || 'Inbox'}
                    </h2>
                    <div className='flex items-center gap-2 text-sm text-gray-500'>
                        <span>{totalItems} Requests</span>
                        <button onClick={onRefresh} className='rounded p-2 hover:bg-gray-100'>
                            <span className='mdi mdi-refresh text-lg'></span>
                        </button>
                    </div>
                </div> */}

                {/* Table Body - FIX: changed overflow-hidden to overflow-auto */}
                <div className='flex-1  p-2 hide-root-header relative '>
                    <DataTable
                        isLoading={isLoading}
                        isReLoading={isRefetching}
                        pageSize={pageSize}
                        table={table}
                        onReload={onRefresh}

                    />

                    {!isLoading && totalItems === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-gray-400 text-sm">No requests found</div>
                        </div>
                    )}
                </div>

                {/* Footer - FIX: Added shrink-0 and pageSizeOptions */}
                <div className=' p-4 shrink-0 bg-primary-1 z-10'>
                    <Pagination
                        itemLabel='Requests'
                        page={page}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        showPageNumbers={false}

                    />
                </div>
            </div>
        </>
    )
}

export default InboxList