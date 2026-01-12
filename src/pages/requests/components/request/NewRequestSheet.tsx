import { useEffect, useState } from "react";
import NewRequestFileUpload from "./components/newrequest/FileUpload";
import Header from "./components/newrequest/Header";
import PoSetupFlowPage from "./components/newrequest/poFlow/PoSetupFlowPage";

interface Props {
    onClose: () => void;
}

type SheetMode = "request" | "po";

const NewRequestSheet = ({ onClose }: Props) => {
    const [mode, setMode] = useState<SheetMode>("request");

    useEffect(() => {

        console.log(mode)
    }, [mode])


    return (
        <div className="flex flex-col">
            <Header
                onClose={onClose}
                title={mode === "po" ? "PO Setup" : "New Request"}
            // optional: show a subtle badge when in PO mode
            // badge={mode === "po" ? "Configuration" : undefined}
            />

            {mode === "request" ? (
                <NewRequestFileUpload
                    onClose={onClose}
                    onStartPoImport={() => setMode("po")}
                />
            ) : (
                <PoSetupFlowPage
                    onExit={() => setMode("request")}
                    onClose={onClose}
                />
            )}
        </div>
    );
};

NewRequestSheet.displayName = "NewRequestSheet";
export default NewRequestSheet;
