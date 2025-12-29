import { useMemo, useState, useEffect } from 'react'
import Drawer from '@/components/base/Drawer'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import requestStore from '../../stores/useRequestStore'

import Footer from './components/Footer'
import Header from './components/Header'
import Overview from './components/sections/overview/Overview'
import Form from './components/sections/Sections'

import Tabs from '@/components/base/tabs/Tabs'
import Tab from '@/components/base/tabs/Tab'

import { useRequestDetail } from '../../hooks/useRequestDetails'

import Attachments from './components/sections/attachment/Attachments'
// import { useFormMetadata } from '../../hooks/useFormMetaData'
import Comments from './components/sections/comment/Comments'
import History from './components/sections/history/History'

const Request = () => {

  const {
    isMaximized,
    isRequestOpen,
    closeRequest,
    selectedItem,
    selectedWorkflowId, activeTabValue, selectedWorkflow
  } = requestStore((state) => state)

  const [activeTab, setActiveTab] = useState<string>(activeTabValue ? activeTabValue : 'Overview')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  console.log(selectedWorkflow, "selectedWorkflow")
  const { data: request, isLoading } = useRequestDetail(
    selectedWorkflowId,
    selectedItem?.processId,
    selectedItem?.transactionId
  )
  // alert(activeTab)
  const agentDataList = request?._agentData || []
  const hasAgentData = agentDataList.length > 0

  useEffect(() => {
    if (hasAgentData && activeTab === 'Form') {
      setActiveTab('Overview')

      if (!selectedAgentId) setSelectedAgentId(agentDataList[0].id)
    }
    if (activeTabValue) {
      setActiveTab(activeTabValue);
    }
  }, [hasAgentData, activeTabValue])

  // Reset selectedAgentId when request data loads
  useEffect(() => {
    if (hasAgentData && agentDataList.length > 0) {
      setSelectedAgentId(agentDataList[0].id)
    } else {
      setSelectedAgentId(null)
    }
  }, [request?._agentData, hasAgentData])

  const currentAgentData = useMemo(() => {
    return agentDataList.find((a: any) => a.id === selectedAgentId) || {}
  }, [agentDataList, selectedAgentId])


  // const { panels } = useFormMetadata(request?._formDefinition?.formJson)

  // const formSections = useMemo(() => {
  //   if (!panels || !request?.formData?.fields) return []
  //   return panels.map((panel: any) => ({
  //     id: panel.id,
  //     title: panel.settings?.title || 'Section',
  //     fields: panel.fields.map((field: any) => {
  //       if (field.settings?.general?.visibility === 'DISABLE') return null
  //       return {
  //         id: field.id,
  //         label: field.label || field.type,
  //         type: field.type,
  //         value: request.formData.fields[field.id],
  //         settings: field.settings
  //       }
  //     }).filter(Boolean)
  //   }))
  // }, [panels, request])


  return (
    <Drawer
      opened={isRequestOpen}
      width={isMaximized ? '100%' : '65%'}
      onClose={closeRequest}
      offset={10}
      key={`request-${selectedItem?.transactionId}-${selectedItem?.processId}-${selectedItem?.requestNo}`}
    >
      {/* Sticky Header */}
      <Header
        isLoading={isLoading}
        requestNo={request?.requestNo || selectedItem?.requestNo}
        stage={request?.stage || selectedItem?.stage}
        raisedBy={request?.raisedBy}
        raisedAt={request?.raisedAt}
      />

      {/* Scrollable Content with Tabs and Footer */}
      <OverlayContent height="calc(100vh - 130px)">
        {/* Sticky Tabs inside OverlayContent */}
        <div className="border-b border-gray-3 px-6 bg-surface sticky top-0 z-10">
          <Tabs value={activeTab} onChange={(val) => setActiveTab(val as string)}>
            {hasAgentData && <Tab label="Overview" value="Overview" />}
            <Tab label="Form" value="Form" />
            <Tab label={`Attachments (${request?.attachmentCount || 0})`} value="Attachments" />
            <Tab label={`Comments (${request?.commentsCount || 0})`} value="Comments" />
            <Tab label="History" value="History" />
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : (
          <>
            {/* Sub-tabs - Sticky if present */}
            {activeTab === 'Overview' && hasAgentData && agentDataList.length > 1 && (
              <div className="px-6 pt-2 bg-gray-50 border-b sticky top-[53px] z-10">
                <Tabs
                  value={selectedAgentId}
                  onChange={(val) => setSelectedAgentId(val as string)}
                >
                  {agentDataList.map((agent: any) => (
                    <Tab key={agent.id} value={agent.id} label={agent.stage} />
                  ))}
                </Tabs>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'Overview' && hasAgentData && (
              <Overview agentData={currentAgentData} />
            )}

            {activeTab === 'Form' && <Form />}

            {activeTab === 'Attachments' && (
              <Attachments
                enabled={activeTab === 'Attachments'}
                workflowId={Number(selectedWorkflowId)}
                processId={Number(selectedItem?.processId)}
              />
            )}
            {activeTab === 'Comments' && <Comments
              enabled={activeTab === 'Comments'}
              workflowId={Number(selectedWorkflowId)}
              processId={Number(selectedItem?.processId)}
            />
            }
            {activeTab === 'History' && <History
              enabled={activeTab === 'History'}
              workflowId={Number(selectedWorkflowId)}
              processId={Number(selectedItem?.processId)}
            />
            }
          </>
        )}
      </OverlayContent>

      {/* Sticky Footer */}
      <Footer />
    </Drawer>
  )
}

Request.displayName = 'Request'
export default Request