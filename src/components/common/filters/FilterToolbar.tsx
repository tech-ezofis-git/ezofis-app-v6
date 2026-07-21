import React from "react";
import { Download, Upload, RefreshCw, FileUp, FileDown } from "lucide-react";
import Button from "@/components/base/button/Button";
import IconButton from "@/components/base/button/IconButton";

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

export function FilterToolbar({ actions }: FilterToolbarProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-l border-border-default pl-2 ml-auto">
      {actions.map((action) => {
        let IconComp: any = null;
        
        if (typeof action.icon === "string") {
          switch (action.icon) {
            case "download": IconComp = Download; break;
            case "upload": IconComp = Upload; break;
            case "refresh": IconComp = RefreshCw; break;
            case "export": IconComp = FileUp; break;
            case "import": IconComp = FileDown; break;
            default: break;
          }
        } else {
          IconComp = action.icon;
        }

        if (action.isIconButton || !action.label) {
          return (
            <IconButton
              key={action.id}
              tooltip={action.tooltip || action.label}
              ariaLabel={action.tooltip || action.label || action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              variant="ghost"
              color="gray"
              size="sm"
              icon={
                typeof action.icon === "string" 
                  ? (action.icon.includes(':') ? action.icon : (IconComp ? undefined : `lucide:${action.icon}`))
                  : undefined
              }
            >
              {IconComp && typeof action.icon === "string" && !action.icon.includes(':') && <IconComp className="h-4 w-4" />}
              {IconComp && typeof action.icon !== "string" && <IconComp className="h-4 w-4" />}
            </IconButton>
          );
        }

        return (
          <Button
            key={action.id}
            variant="outline"
            color="gray"
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className="flex items-center gap-1.5"
            icon={typeof action.icon === "string" ? (action.icon.includes(':') ? action.icon : (IconComp ? undefined : `lucide:${action.icon}`)) : undefined}
          >
            {IconComp && typeof action.icon === "string" && !action.icon.includes(':') && <IconComp className="h-3.5 w-3.5" />}
            {IconComp && typeof action.icon !== "string" && <IconComp className="h-3.5 w-3.5" />}
            <span>{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
