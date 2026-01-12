import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Icon from "@/components/base/icon/Icon";
import Alert from "@/components/base/Alert";
import { motion } from "motion/react";

import {
    AnimateFadeIn,
    AnimateScale,
    AnimateStagger,
    AnimateEntrancePop
} from "@/components/common/animations";

export type DropzoneUploadCardHandle = {
    open: () => void;
    reset: () => void;
};

type FileIcon = {
    icon: string;
    bg: string;
    color: string;
};

type Props = {
    title: string;
    subtitle: string;
    accept: string;
    multiple?: boolean;
    heightClassName?: string;

    primaryIcon?: { icon: string; bg: string; color: string };
    fileTypeIcons?: FileIcon[];

    helperText?: string;

    selectedFileName?: string | null;

    /** controlled loading state from parent */
    isLoading?: boolean;
    /** controlled loading message from parent */
    loadingText?: string;

    /** Parent handles upload/parse; we just provide FileList */
    onFiles: (files: FileList | null) => void;

    /** Optional: disable interactions */
    disabled?: boolean;
};

const FileUpload = forwardRef<DropzoneUploadCardHandle, Props>(function DropzoneUploadCard(
    {
        title,
        subtitle,
        accept,
        multiple = false,
        heightClassName = "h-[250px]",
        primaryIcon = { icon: "tabler:upload", bg: "bg-[var(--primary-3)]", color: "text-[var(--primary-9)]" },
        fileTypeIcons = [],
        helperText,
        selectedFileName,
        isLoading = false,
        loadingText = "Processing…",
        onFiles,
        disabled = false
    },
    ref
) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const open = () => {
        if (disabled || isLoading) return;
        inputRef.current?.click();
    };

    const reset = () => {
        if (inputRef.current) inputRef.current.value = "";
    };

    useImperativeHandle(ref, () => ({ open, reset }), [disabled, isLoading]);

    return (
        <div className="rounded-2xl border border-[var(--gray-4)] bg-[var(--gray-0)] p-5 shadow-sm">
            <AnimateEntrancePop>
                <h3 className="text-center text-lg font-semibold text-[var(--gray-13)]">{title}</h3>
                <p className="mb-3 text-center text-12 leading-relaxed text-[var(--gray-11)] mx-auto max-w-[650px]">
                    {subtitle}
                </p>
            </AnimateEntrancePop>

            <AnimateScale>
                <div
                    className={[
                        "group relative w-full rounded-3xl border-2 border-dashed transition-all duration-300",
                        "flex flex-col items-center justify-center gap-6 p-8",
                        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                        heightClassName,
                        isDragOver
                            ? "border-[var(--primary-9)] bg-[var(--primary-2)] scale-[1.01]"
                            : "border-[var(--violet-4)] bg-[var(--gray-0)] hover:border-[var(--primary-7)] hover:bg-[var(--primary-1)]"
                    ].join(" ")}
                    onClick={open}
                    onDragOver={(e) => {
                        e.preventDefault();
                        if (disabled || isLoading) return;
                        setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (disabled || isLoading) return;
                        setIsDragOver(false);
                        onFiles(e.dataTransfer.files);
                        reset(); // reset so selecting same file again still triggers change
                    }}
                >
                    <AnimateStagger className="mt-4 flex items-center gap-4">
                        <div className={["flex size-16 items-center justify-center rounded-lg shadow-sm", primaryIcon.bg, primaryIcon.color].join(" ")}>
                            <Icon name={primaryIcon.icon} className="size-6" />
                        </div>
                    </AnimateStagger>

                    <div className="text-center">
                        <div className="text-20 font-medium text-[var(--gray-12)]">
                            Drop your file here, or <span className="text-[var(--primary-9)]">browse</span>
                        </div>
                        {helperText ? <div className="mt-2 text-14 text-[var(--gray-10)]">{helperText}</div> : null}
                    </div>

                    {fileTypeIcons?.length ? (
                        <AnimateStagger className="mb-4 flex items-center gap-4">
                            {fileTypeIcons.map((it) => (
                                <div
                                    key={it.icon}
                                    className={["flex size-10 items-center justify-center rounded-lg shadow-sm", it.bg, it.color].join(" ")}
                                >
                                    <Icon name={it.icon} className="size-6" />
                                </div>
                            ))}
                        </AnimateStagger>
                    ) : null}

                    <input
                        ref={inputRef}
                        type="file"
                        multiple={multiple}
                        className="hidden"
                        accept={accept}
                        onChange={(e) => {
                            onFiles(e.target.files);
                            reset(); // important: allow re-select same file
                        }}
                    />

                    {isLoading ? (
                        <AnimateFadeIn className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-[var(--gray-0)] bg-opacity-80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <span className="size-10 rounded-full border-4 border-[var(--primary-9)] border-t-transparent animate-spin" />
                                <motion.span
                                    initial={{ opacity: 0.5 }}
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="text-14 font-medium text-[var(--primary-11)]"
                                >
                                    {loadingText}
                                </motion.span>
                            </div>
                        </AnimateFadeIn>
                    ) : null}
                </div>
            </AnimateScale>

            {selectedFileName ? (
                <AnimateEntrancePop className="mt-8">
                    <Alert text={`Selected File: ${selectedFileName}`} variant="green" />
                </AnimateEntrancePop>
            ) : null}
        </div>
    );
});

export default FileUpload;
