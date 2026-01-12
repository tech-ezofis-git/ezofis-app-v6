// import { useEffect, useState } from "react";
import NewRequestFileUpload from "./components/newrequest/FileUpload";
import Header from "./components/newrequest/Header";
import PoSetupFlowPage from "./components/newrequest/poFlow/PoSetupFlowPage";
import requestStore from "../../stores/useRequestStore";

interface Props {
    onClose: () => void;
}

// type SheetMode = "request" | "po";

const NewRequestSheet = ({ onClose }: Props) => {
    // const [mode, setMode] = useState<SheetMode>("request");

    const { newRequestMeta } = requestStore((state) => state)




    return (
        <div className="flex flex-col">
            <Header
                onClose={onClose}
                title={newRequestMeta === "po" ? "PO Setup" : "New Request"}
            // optional: show a subtle badge when in PO mode
            // badge={mode === "po" ? "Configuration" : undefined}
            />

            {newRequestMeta === "request" ? (
                <NewRequestFileUpload
                    onClose={onClose}
                // onStartPoImport={() => setMode("po")}
                />
            ) : (
                <PoSetupFlowPage
                    // onExit={() => setMode("request")}
                    onClose={onClose}
                />
            )}
        </div>
    );
};

NewRequestSheet.displayName = "NewRequestSheet";
export default NewRequestSheet;
