import { useState, useEffect } from 'react';
import { useAttachments } from '@/pages/requests/hooks/useAttachments';
import FileSheet from '@/components/common/file-sheet/FileSheet';
import authUserStore from '@/stores/authUserStore'

const Attachments = ({ workflowId, processId, transactionId }: any) => {
    const [fileSheetOpened, setFileSheetOpened] = useState(false);
    const { data: attachmentData } = useAttachments(workflowId, processId, transactionId);
    const [attachmentsAvailable, setAttachmentsAvailable] = useState(false);

    const { session } = authUserStore.getState()
    const tenantId = session?.tenantId
    const userId = session?.id

    // Check if there are attachments available
    useEffect(() => {
        if (attachmentData?.length > 0) {
            setAttachmentsAvailable(true);
            setFileSheetOpened(true); // Open the file sheet by default if attachments exist
        } else {
            setAttachmentsAvailable(false);
        }
    }, [attachmentData]);

    return (
        <div className="flex flex-col  h-full">
            {/* FileSheet section */}
            <div className="w-full h-full">
                {attachmentsAvailable ? (
                    <div className="relative w-full h-full">
                        <FileSheet
                            opened={fileSheetOpened}
                            onClose={() => setFileSheetOpened(false)}
                            file={attachmentData[0]} // Open the first attachment by default
                            tenantId={tenantId} // Pass appropriate tenantId
                            userId={userId} // Pass appropriate userId
                            workflowId={workflowId} // Pass appropriate workflowId
                            processId={processId} // Pass appropriate processId
                            type={2}
                            actions=""
                        />
                    </div>
                ) : (
                    <div className="text-center text-gray-500">
                        No files available.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Attachments;
