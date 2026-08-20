import AnimateSlideUp from '@/components/common/animations/AnimateSlideUp'
import AttachmentsPanel, {
  type AttachmentEntry,
} from './components/AttachmentsPanel'
import CommentsPanel, { type LocalComment } from './components/CommentsPanel'

interface Props {
  attachments: AttachmentEntry[]
  commentDraft: string
  comments: LocalComment[]
  isUploadingAttachment: boolean
  onAddAttachment: (files: FileList | null) => void
  onCommentDraftChange: (value: string) => void
  onRemoveAttachment: (fileId: string) => void
  onSendComment: () => void
}

// Right-hand rail alongside the dynamic form: general attachments +
// initiator notes. Kept as a separate module so it can be reused (or
// dropped) independent of the form column.
const WorkflowRequestSidebar = ({
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
      <AnimateSlideUp delay={0.1}>
        <AttachmentsPanel
          attachments={attachments}
          isUploading={isUploadingAttachment}
          onAdd={onAddAttachment}
          onRemove={onRemoveAttachment}
        />
      </AnimateSlideUp>
      <AnimateSlideUp delay={0.2}>
        <CommentsPanel
          comments={comments}
          draft={commentDraft}
          onDraftChange={onCommentDraftChange}
          onSend={onSendComment}
        />
      </AnimateSlideUp>
    </div>
  )
}

WorkflowRequestSidebar.displayName = 'WorkflowRequestSidebar'
export default WorkflowRequestSidebar
