import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Option } from '@/types/option'
import {
  createPublishedWorkflowBrowsePayload,
  mapPublishedBrowseResponseToOptions,
} from '@/api/v6/workflows'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import InputSelect from '@/components/base/inputs/InputSelect'
import useCurrentBuilderWorkflowId from '../../../hooks/useCurrentBuilderWorkflowId'

interface Props {
  value: number | string | null | undefined
  description?: string
  error?: string
  label?: string
  required?: boolean
  /** Display name saved alongside the id, used until the list loads. */
  valueName?: string
  onChange: (option: Option | null) => void
}

// Published workflows a block can start as a child. The workflow being
// edited is left out so a workflow can't start itself (V5 allowed it).
export default function SubWorkflowPicker({
  description,
  error,
  label = 'Workflow',
  required,
  value,
  valueName,
  onChange,
}: Props) {
  const currentWorkflowId = useCurrentBuilderWorkflowId()
  const payload = useMemo(() => createPublishedWorkflowBrowsePayload(), [])
  const { data, isError, isLoading } = useQuery(
    getWorkflowListQueryOptions(payload),
  )

  const options: Option[] = useMemo(
    () =>
      mapPublishedBrowseResponseToOptions(data ?? null)
        .filter((w) => String(w.id) !== String(currentWorkflowId ?? ''))
        .map((w) => ({ id: String(w.id), name: w.name })),
    [currentWorkflowId, data],
  )

  const selected: Option | null = useMemo(() => {
    if (value === null || value === undefined || value === '' || value === 0)
      return null
    return (
      options.find((o) => String(o.id) === String(value)) ?? {
        id: String(value),
        name: valueName || `Workflow #${value}`,
      }
    )
  }, [options, value, valueName])

  return (
    <InputSelect
      description={description}
      error={error || (isError ? "Couldn't load workflows" : undefined)}
      label={label}
      loading={isLoading}
      options={options}
      placeholder='Select a published workflow'
      required={required}
      value={selected}
      clearable
      onChange={onChange}
    />
  )
}
