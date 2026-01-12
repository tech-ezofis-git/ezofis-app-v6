
import Button from "@/components/base/button/Button";

interface Props {
    onClose?: () => void;
    onPrimaryClick?: () => void;
    primaryLabel?: string;
    secondaryLabel?: string;
    isPrimaryLoading?: boolean;
    isPrimaryDisabled?: boolean;
    isSecondaryDisabled?: boolean;
}

const Footer = ({
    onClose,
    onPrimaryClick,
    primaryLabel = "Submit",
    // secondaryLabel = "Back",
    isPrimaryLoading = false,
    isPrimaryDisabled = false,
    // isSecondaryDisabled = false,
}: Props) => {
    return (
        <div className="flex items-center justify-between border-t border-gray-3 bg-slate-50 px-4 py-3">


            {/* Right: actions */}
            <div className="ml-auto flex items-center gap-2">
                {/* <Button
                    label={secondaryLabel}
                    variant="outline"
                    size="md"
                    onClick={onClose}
                    disabled={isSecondaryDisabled || isPrimaryLoading}
                /> */}
                <Button
                    label={primaryLabel}
                    variant="solid"
                    size="md"
                    onClick={onPrimaryClick ?? onClose}
                    disabled={isPrimaryDisabled || isPrimaryLoading}
                    loading={isPrimaryLoading}
                />
            </div>
        </div>
    );
};

Footer.displayName = "Footer";
export default Footer;