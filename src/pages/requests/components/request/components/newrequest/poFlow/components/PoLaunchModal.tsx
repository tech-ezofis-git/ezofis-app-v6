import { Modal } from "@mantine/core";
import Icon from "@/components/base/icon/Icon";

type Props = {
    opened: boolean;
    onClose: () => void;
    onProceed: () => void;
};

export default function PoLaunchModal({ opened, onClose, onProceed }: Props) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            centered
            radius="lg"
            size="lg"
            withCloseButton={false}
            overlayProps={{ blur: 4, opacity: 0.55 }}
        >
            <div className="relative overflow-hidden rounded-xl">
                {/* Colorful header */}
                <div className="relative rounded-2xl bg-gradient-to-r from-[var(--primary-9)] via-[var(--violet-9)] to-[var(--pink-9)] p-5 text-white">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-4 text-18 font-semibold">
                                <Icon name="tabler:cloud-upload"
                                    className="size-5" />
                                PO Import
                            </div>
                            {/* <div className="mt-1 text-13 text-white/80">
                                A guided flow for template → upload → mapping → preview.
                            </div> */}
                        </div>

                        <button
                            onClick={onClose}
                            className="cursor-pointerrounded-lg bg-white/10 px-2 py-1 text-12 font-semibold text-white hover:bg-white/15"
                        >
                            <Icon name="tabler:x"
                                className="size-5" />
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] p-4">
                            <div className="flex items-center gap-2 text-13 font-semibold text-[var(--gray-12)]">
                                <Icon name="tabler:download" className="size-4 text-[var(--primary-9)]" />
                                Template
                            </div>
                            <div className="mt-1 text-12 text-[var(--gray-10)]">
                                Don't have a PO file ready? Use our template to ensure your data matches our system.
                            </div>
                        </div>

                        <div className="rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] p-4">
                            <div className="flex items-center gap-2 text-13 font-semibold text-[var(--gray-12)]">
                                <Icon name="tabler:upload" className="size-4 text-[var(--primary-9)]" />
                                Upload
                            </div>
                            <div className="mt-1 text-12 text-[var(--gray-10)]">
                                Upload a PO file; we’ll extract headers for mapping.
                            </div>
                        </div>

                        <div className="rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] p-4">
                            <div className="flex items-center gap-2 text-13 font-semibold text-[var(--gray-12)]">
                                <Icon name="tabler:circle-check" className="size-4 text-[var(--primary-9)]" />
                                Confirm
                            </div>
                            <div className="mt-1 text-12 text-[var(--gray-10)]">
                                Validate mappings and confirm to finalize import payload.
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="cursor-pointer
                            rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-4 py-2 text-13 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)]"
                        >
                            Not now
                        </button>
                        <button
                            onClick={onProceed}
                            className="cursor-pointer
                            rounded-xl bg-[var(--primary-9)] px-4 py-2 text-13 font-semibold text-white shadow-sm hover:bg-[var(--primary-10)]"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
