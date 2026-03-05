import cn from '@/utils/cn';
import Icon from '@/components/base/icon/Icon';

interface SectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    icon: string;
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'premium';
}

export default function SettingsSection({
    title,
    isOpen,
    onToggle,
    icon,
    children,
    className,
    variant = 'default'
}: SectionProps) {
    return (
        <div className={cn("flex flex-col gap-1", isOpen && "mb-2.5", className)}>
            <div
                className="cursor-pointer select-none flex items-center justify-between group p-2 -mx-2 rounded-xl hover:bg-[#f0f2f5] active:scale-[0.99] transition-all duration-300"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "inline-block w-1 h-5 rounded transition-all duration-300",
                        isOpen ? "bg-primary-9 scale-y-110" : "bg-gray-3"
                    )} />
                    <Icon
                        name={icon}
                        className={cn(
                            "h-4 w-4 animate-in zoom-in-50 duration-500 transition-colors duration-300",
                            isOpen ? "text-primary-9" : "text-gray-8"
                        )}
                    />
                    <span className={cn(
                        "font-medium text-13 transition-colors duration-300",
                        isOpen ? "text-primary-9" : "text-gray-11"
                    )}>{title}</span>
                </div>
                <div className={cn(
                    "transition-all duration-300",
                    isOpen ? "text-primary-9" : "text-gray-8"
                )}>
                    <Icon
                        name="lucide:chevron-down"
                        className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")}
                    />
                </div>
            </div>
            {isOpen && (
                <div className={cn(
                    "rounded-xl animate-in fade-in slide-in-from-top-2 duration-300",
                    variant === 'premium'
                        ? "bg-[#F8FAFC] p-3 space-y-3"
                        : "bg-white shadow-sm p-3.5 space-y-3.5 border border-gray-2"
                )}>
                    {children}
                </div>
            )}
        </div>
    );
}
