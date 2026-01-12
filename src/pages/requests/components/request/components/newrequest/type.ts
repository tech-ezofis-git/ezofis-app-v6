type Props = {
  onClose: () => void
  onStartPoImport?: () => void // NEW (optional)
}

type UploadItem = {
  id: string
  file: File
  name: string
  size: number
  type: string
}

// type ToastType = "success" | "error";
// type ToastState = {
//     show: boolean;
//     type: ToastType;
//     message: string;
//     runKey: number;
// };

export type { Props, UploadItem }
