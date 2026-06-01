import { Button, IconButton } from "./Ui";
import type { ExplorerView } from "../types/folderTypes";
import { DynamicIcon } from "./icons";

type ExplorerToolbarProps = {
  view: ExplorerView;
  setView: (view: ExplorerView) => void;
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  onUpload?: () => void;
  onNewFolder?: () => void;
  onDownload?: () => void;
};

export function ExplorerToolbar({
  view,
  setView,
  onBack,
  onForward,
  onRefresh,
  onUpload,
  onNewFolder,
}: ExplorerToolbarProps) {
  return (
    <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-5">
      <div className="flex items-center gap-3">
        <IconButton
          icon="chevronRight"
          className="rotate-180"
          onClick={onBack}
        />
        <IconButton icon="chevronRight" onClick={onForward} />
        <IconButton icon="refresh" onClick={onRefresh} />

        <span className="mx-1 h-6 w-px bg-gray-3" />

        <Button
          type="button"
          onClick={onUpload}
          className="border-transparent shadow-none"
        >
          <DynamicIcon name="upload" />
          Upload
        </Button>

        <Button
          type="button"
          onClick={onNewFolder}
          className="border-transparent shadow-none"
        >
          <DynamicIcon name="folderPlus" />
          New Folder
        </Button>
      </div>

      <div className="flex rounded-lg bg-gray-2 p-1">
        <IconButton
          icon="list"
          active={view === "list"}
          onClick={() => setView("list")}
        />
        <IconButton
          icon="grid"
          active={view === "grid"}
          onClick={() => setView("grid")}
        />
      </div>
    </div>
  );
}
