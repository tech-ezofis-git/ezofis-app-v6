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
  onClose: () => void
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
  onClose,
  onCommentDraftChange,
  onRemoveAttachment,
  onSendComment,
}: Props) => {
  return (
    <div className='flex h-full min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-l border-gray-3 bg-gray-1'>
      {activePanel === 'attachments' ? (
        <AttachmentsPanel
          attachments={attachments}
          isUploading={isUploadingAttachment}
          onAdd={onAddAttachment}
          onClose={onClose}
          onRemove={onRemoveAttachment}
        />
      ) : (
        <CommentsPanel
          comments={comments}
          draft={commentDraft}
          onClose={onClose}
          onDraftChange={onCommentDraftChange}
          onSend={onSendComment}
        />
      )}
    </div>
  )
}

WorkflowRequestSidebar.displayName = 'WorkflowRequestSidebar'
export default WorkflowRequestSidebar
