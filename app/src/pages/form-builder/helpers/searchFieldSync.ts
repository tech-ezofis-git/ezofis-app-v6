import formApi from '@/api/form/form'
import showToast from '@/components/base/toast/showToast'

export interface ExecuteSearchFieldParams {
  field: any
  searchValue: any
  currentFormId?: string
  formModel: Record<string, any>
  panels?: any[]
  onUpdateModel: (patch: Record<string, any>) => void
  onSearchingStateChange?: (isSearching: boolean) => void
}

/**
 * Executes a search query for a Search Field (Lookup / Auto-Sync)
 * and hydrates mapped target fields in the current form.
 * Includes detailed console logging for debugging.
 */
export async function executeSearchFieldSync({
  field,
  searchValue,
  currentFormId,
  formModel,
  panels,
  onUpdateModel,
  onSearchingStateChange,
}: ExecuteSearchFieldParams) {
  const specific = field?.settings?.specific || {}
  const {
    isSearchField,
    hasSameForm = 'YES',
    searchFormId,
    masterSyncField,
    masterFormSyncSettings = [],
    formSyncField = [],
  } = specific

  console.group('🔍 [SearchFieldSync] Starting Search Execution')
  console.log('📌 1. Search Configuration:', {
    fieldId: field?.id,
    fieldLabel: field?.label,
    fieldType: field?.type,
    isSearchField,
    hasSameForm,
    searchFormId,
    masterSyncField,
    formSyncField,
    masterFormSyncSettings,
  })

  if (
    isSearchField !== 'YES' ||
    searchValue === undefined ||
    searchValue === null ||
    String(searchValue).trim() === ''
  ) {
    console.warn(
      '⚠️ [SearchFieldSync] Search skipped: Search Field not enabled or search value is empty.',
      {
        isSearchField,
        searchValue,
      },
    )
    console.groupEnd()
    return
  }

  const cleanSearchVal = String(searchValue).trim()
  const isSameForm = hasSameForm === 'YES' || hasSameForm === true
  const targetFormId = isSameForm ? currentFormId : searchFormId
  const filterKey = isSameForm ? field?.id : masterSyncField

  console.log('🎯 2. Target & Lookup Parameters:', {
    searchValueRaw: searchValue,
    cleanSearchVal,
    isSameForm,
    currentFormId,
    targetFormId,
    lookingForKey: filterKey,
    mode: isSameForm
      ? 'Same Form (Current Form Records)'
      : 'Master Form Lookup',
  })

  if (!targetFormId) {
    console.error(
      '❌ [SearchFieldSync] Target Form ID is missing or not configured!',
    )
    showToast({
      message: 'Search target form is not configured.',
      variant: 'error',
    })
    console.groupEnd()
    return
  }

  onSearchingStateChange?.(true)

  try {
    console.log(
      `📡 3. Querying Form Entries for Target Form ID: "${targetFormId}"...`,
    )
    // Fetch entries for the target form
    const res = await formApi.getFormEntries(targetFormId, 1, 500)
    let entries: any[] = []

    if (res?.data) {
      if (Array.isArray(res.data)) entries = res.data
      else if (Array.isArray(res.data.entries)) entries = res.data.entries
      else if (Array.isArray(res.data.items)) entries = res.data.items
      else if (Array.isArray(res.data.data)) entries = res.data.data
      else if (Array.isArray(res.data.value)) entries = res.data.value
      else if (res.data.data && Array.isArray(res.data.data.entries))
        entries = res.data.data.entries
    }

    console.log(`📦 4. Data Received from API:`, {
      rawResponse: res,
      totalEntriesFound: entries.length,
      entriesSample: entries.slice(0, 5), // Preview first 5 entries
    })

    // Helper to normalize keys for flexible matching (handles spaces, underscores, casing)
    const normalizeKey = (k: string) =>
      String(k || '')
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]+/g, '')

    // Helper to safely extract field values from record object by key (exact or normalized)
    const getFieldValueByKey = (
      fieldsMap: Record<string, any>,
      key: string,
    ): any => {
      if (!fieldsMap || !key) return undefined
      if (fieldsMap[key] !== undefined) return fieldsMap[key]
      const normKey = normalizeKey(key)
      const foundKey = Object.keys(fieldsMap).find(
        (k) => normalizeKey(k) === normKey,
      )
      return foundKey ? fieldsMap[foundKey] : undefined
    }

    // Helper to extract fields dictionary from an entry record
    const getFieldsFromEntry = (entry: any): Record<string, any> => {
      if (!entry) return {}
      let rawData =
        entry.value || entry.fields || entry.formData || entry.data || entry
      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData)
        } catch {
          // ignore parsing error
        }
      }

      const recordMap: Record<string, any> = {}

      // Copy all top-level properties of entry first
      if (typeof entry === 'object' && entry !== null) {
        Object.keys(entry).forEach((k) => {
          if (
            k !== 'value' &&
            k !== 'fields' &&
            k !== 'formData' &&
            k !== 'data'
          ) {
            recordMap[k] = entry[k]
          }
        })
      }

      if (Array.isArray(rawData)) {
        rawData.forEach((item: any) => {
          if (item?.id !== undefined) recordMap[item.id] = item.value
          if (item?.name !== undefined && !recordMap[item.name])
            recordMap[item.name] = item.value
          if (item?.label !== undefined && !recordMap[item.label])
            recordMap[item.label] = item.value
        })
      } else if (typeof rawData === 'object' && rawData !== null) {
        Object.keys(rawData).forEach((k) => {
          recordMap[k] = rawData[k]
        })
      }
      return recordMap
    }

    console.log('⚙️ 5. Searching entries for matching key & value...')
    let matchedEntry: any = null
    let matchedFieldsMap: Record<string, any> = {}

    // Find matching entry record
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]
      const fields = getFieldsFromEntry(entry)
      let isMatch = false
      let matchedByKey = ''
      let matchedVal = undefined

      // 1. Match by specified filterKey (exact or normalized)
      if (filterKey) {
        const valFromKey = getFieldValueByKey(fields, filterKey)
        if (valFromKey !== undefined && valFromKey !== null) {
          if (
            String(valFromKey).trim().toLowerCase() ===
            cleanSearchVal.toLowerCase()
          ) {
            isMatch = true
            matchedByKey = filterKey
            matchedVal = valFromKey
          }
        }
      }

      // 2. Fallback: check all field values in record if direct filterKey lookup missed
      if (!isMatch) {
        for (const key in fields) {
          const val = fields[key]
          if (
            val !== undefined &&
            val !== null &&
            typeof val !== 'object' &&
            String(val).trim().toLowerCase() === cleanSearchVal.toLowerCase()
          ) {
            isMatch = true
            matchedByKey = key
            matchedVal = val
            break
          }
        }
      }

      if (isMatch) {
        matchedEntry = entry
        matchedFieldsMap = fields
        console.log(`✅ MATCH FOUND at Entry Index [${index}]:`, {
          entryId: entry.id || entry.item_id || entry._id || index,
          matchedByKey,
          matchedValueInEntry: matchedVal,
          searchedValue: cleanSearchVal,
          allFieldsInEntry: fields,
        })
        break
      }
    }

    if (matchedEntry) {
      console.log('🔄 6. Mapping & Syncing Target Fields...')
      const patch: Record<string, any> = {}
      const mappingLog: Array<{
        targetFormField: string
        sourceMasterField?: string
        valueExtracted: any
        status: string
      }> = []

      if (isSameForm) {
        if (Array.isArray(formSyncField)) {
          formSyncField.forEach((targetFieldId: string) => {
            const valExtracted = getFieldValueByKey(
              matchedFieldsMap,
              targetFieldId,
            )
            if (valExtracted !== undefined) {
              patch[targetFieldId] = valExtracted
              mappingLog.push({
                targetFormField: targetFieldId,
                valueExtracted: valExtracted,
                status: 'FOUND & POPULATED',
              })
            } else {
              mappingLog.push({
                targetFormField: targetFieldId,
                valueExtracted: undefined,
                status: 'NOT PRESENT IN RECORD',
              })
            }
          })
        }
      } else {
        if (Array.isArray(masterFormSyncSettings)) {
          masterFormSyncSettings.forEach((mapping: any) => {
            const { formField, masterField } = mapping
            if (formField && masterField) {
              const valExtracted = getFieldValueByKey(
                matchedFieldsMap,
                masterField,
              )
              if (valExtracted !== undefined) {
                patch[formField] = valExtracted
                mappingLog.push({
                  targetFormField: formField,
                  sourceMasterField: masterField,
                  valueExtracted: valExtracted,
                  status: 'FOUND & POPULATED',
                })
              } else {
                mappingLog.push({
                  targetFormField: formField,
                  sourceMasterField: masterField,
                  valueExtracted: undefined,
                  status: 'NOT PRESENT IN RECORD',
                })
              }
            }
          })
        }
      }

      console.log('📊 Field Mapping Summary Table:', mappingLog)
      console.log('✨ 7. Final Patch Generated for Form State:', patch)

      if (Object.keys(patch).length > 0) {
        onUpdateModel(patch)
        showToast({
          message: 'Form fields auto-synced from record.',
          variant: 'success',
        })
      } else {
        console.warn(
          '⚠️ [SearchFieldSync] Matching record found, but no values matched configured sync fields.',
        )
        showToast({
          message: 'Matching record found, but no values were mapped.',
          variant: 'info',
        })
      }
    } else {
      console.warn(
        `⚠️ [SearchFieldSync] No matching record found for search value "${cleanSearchVal}" under key "${filterKey}".`,
        {
          searchedKey: filterKey,
          searchedVal: cleanSearchVal,
          totalEntriesChecked: entries.length,
        },
      )
      showToast({
        message: `No matching entry found for "${cleanSearchVal}".`,
        variant: 'warning',
      })
    }
  } catch (err: any) {
    console.error('❌ [SearchFieldSync] Error executing search:', err)
    showToast({
      message: 'Failed to search form entries.',
      variant: 'error',
    })
  } finally {
    onSearchingStateChange?.(false)
    console.groupEnd()
  }
}
