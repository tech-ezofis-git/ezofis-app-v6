import IconButton from "@/components/base/button/IconButton";
import Icon from "@/components/base/icon/Icon";

interface Props {
    onClose: () => void;
    title?: string;
    badge?: string;
}

const Header = ({ onClose, title = "New Request", badge }: Props) => {
    return (
        <div className="flex h-13 items-center justify-between gap-2 border-b border-gray-3 px-2">
            <div className="flex items-center gap-1.5">
                <IconButton aria-label="Back" variant="ghost" color="gray" onClick={onClose}>
                    <Icon name="tabler:arrow-left" className="size-4 text-gray-10" />
                </IconButton>

                <div className="flex items-center gap-2">
                    <h1 className="m-0 text-15 font-semibold text-gray-13">{title}</h1>

                    {badge ? (
                        <span className="rounded-full bg-[var(--primary-2)] px-2 py-0.5 text-12 font-semibold text-[var(--primary-11)]">
                            {badge}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center gap-1">{/* future actions */}</div>
        </div>
    );
};

Header.displayName = "Header";
export default Header;
