import React from "react";
import IconButton from "@/components/base/button/IconButton";
import Button from "@/components/base/button/Button";
import Icon from "@/components/base/icon/Icon";

export interface ToolbarAction {
  id: string;
  label?: string;
  icon?: string | React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  isIconButton?: boolean;
}

export interface FilterToolbarProps {
  actions?: ToolbarAction[];
}

const resolveIconName = (icon?: string | React.ElementType): string | undefined => {
  if (typeof icon !== "string") return undefined;
  if (icon.includes(":")) return icon;

  const legacyMap: Record<string, string> = {
    download: "tabler:download",
    upload: "tabler:upload",
    refresh: "tabler:refresh",
    export: "tabler:file-export",
    import: "tabler:file-import",
    columns: "tabler:columns",
    filter: "tabler:filter",
  };

  return legacyMap[icon] || `lucide:${icon}`;
};

export function FilterToolbar({ actions }: FilterToolbarProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="ml-auto flex items-center gap-1.5">
      {actions.map((action) => {
        const iconName = resolveIconName(action.icon);
        const IconComp =
          typeof action.icon === "function" ? action.icon : null;

        if (action.isIconButton || !action.label) {
          return (
            <IconButton
              key={action.id}
              ariaLabel={action.tooltip || action.label || action.id}
              color="gray"
              disabled={action.disabled}
              icon={iconName}
              size="sm"
              tooltip={action.tooltip || action.label}
              variant="outline"
              onClick={action.onClick}
            >
              {IconComp ? <IconComp className="h-4 w-4" /> : null}
            </IconButton>
          );
        }

        return (
          <Button
            key={action.id}
            className="flex items-center gap-1.5"
            color="gray"
            disabled={action.disabled}
            icon={iconName}
            size="sm"
            variant="outline"
            onClick={action.onClick}
          >
            {IconComp ? <IconComp className="h-3.5 w-3.5" /> : null}
            {!iconName && !IconComp && action.icon ? (
              <Icon className="h-3.5 w-3.5" name="tabler:circle" />
            ) : null}
            <span>{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
