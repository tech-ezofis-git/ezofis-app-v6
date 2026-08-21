import AnimateSlideUp from '@/components/common/animations/AnimateSlideUp'
import AttachmentsPanel, {
  type AttachmentEntry,
} from './components/AttachmentsPanel'
import CommentsPanel, { type LocalComment } from './components/CommentsPanel'

interface Props {
  activePanel: 'attachments' | 'comments'
  attachments: AttachmentEntry[]
  commentDraft: string
  comments: LocalComment[]
  isUploadingAttachment: boolean
  onAddAttachment: (files: FileList | null) => void
  onCommentDraftChange: (value: string) => void
  onRemoveAttachment: (fileId: string) => void
  onSendComment: () => void
}

// Right-hand rail alongside the dynamic form, toggled open from the header's
// Attachments/Comments icon buttons — shows whichever one is active, not
// both at once, so the form gets the full width back when it's closed.
const WorkflowRequestSidebar = ({
  activePanel,
  attachments,
  commentDraft,
  comments,
  isUploadingAttachment,
  onAddAttachment,
  onCommentDraftChange,
  onRemoveAttachment,
  onSendComment,
}: Props) => {
  return (
    <div className='flex w-[340px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-gray-3 bg-gray-1 p-4'>
      <AnimateSlideUp delay={0.05}>
        {activePanel === 'attachments' ? (
          <AttachmentsPanel
            attachments={attachments}
            isUploading={isUploadingAttachment}
            onAdd={onAddAttachment}
            onRemove={onRemoveAttachment}
          />
        ) : (
          <CommentsPanel
            comments={comments}
            draft={commentDraft}
            onDraftChange={onCommentDraftChange}
            onSend={onSendComment}
          />
        )}
      </AnimateSlideUp>
    </div>
  )
}

WorkflowRequestSidebar.displayName = 'WorkflowRequestSidebar'
export default WorkflowRequestSidebar
