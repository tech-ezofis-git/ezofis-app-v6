import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Search } from "lucide-react";
import Icon from "@/components/base/icon/Icon";
import Tooltip from "@/components/base/Tooltip";
import cn from "@/utils/cn";
import {
  detectFieldType,
  generateCategoryOptions,
  generateDateRanges,
  generateNumericBuckets,
  type FilterOption,
  type FilterFieldType
} from "@/utils/filterUtils";
import { CategoryFilterMenu, DateFilterMenu, NumberFilterMenu } from "./filters/FilterMenus";
import { FilterToolbar, type ToolbarAction } from "./filters/FilterToolbar";

const FILTER_MENU_Z_INDEX = 50000;
const VIEWPORT_GAP = 8;

export interface DynamicFilterField {
  id: string;
  label: string;
  type?: FilterFieldType;
  width?: number;
  valueGetter?: (item: any) => any;
  options?: FilterOption[];
}

export interface QuickFilterOption {
  id: string;
  label: string;
  icon?: string;
  count?: number;
  type?: 'date' | 'category';
  options?: { label: string; value: string }[];
}

export interface DynamicFilterProps {
  dataset: any[];
  fields: DynamicFilterField[];
  activeFilters: Record<string, string | string[]>;
  onFilterChange: (id: string, values: string | string[]) => void;
  toolbarActions?: ToolbarAction[];
  quickFilters?: QuickFilterOption[];
  activeQuickFilters?: string[];
  onQuickFilterToggle?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  customSearchComponent?: React.ReactNode;
  viewMode?: "grid" | "table";
  onViewModeChange?: (mode: "grid" | "table") => void;
  onClearAll?: () => void;
}

export default function DynamicFilter({
  dataset,
  fields,
  activeFilters,
  onFilterChange,
  toolbarActions,
  quickFilters,
  activeQuickFilters,
  onQuickFilterToggle,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  customSearchComponent,
  viewMode,
  onViewModeChange,
  onClearAll
}: DynamicFilterProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width?: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const fieldData = useMemo(() => {
    const data: Record<string, { type: FilterFieldType; options: FilterOption[] }> = {};
    for (const field of fields) {
      if (field.options && field.options.length > 0) {
        data[field.id] = { type: field.type || "category", options: field.options };
        continue;
      }

      const type = field.type && field.type !== "unknown" ? field.type : detectFieldType(dataset, field.id, field.valueGetter);
      let options: FilterOption[] = [];
      if (type === "category" || type === "boolean" || type === "unknown") {
        options = generateCategoryOptions(dataset, field.id, field.valueGetter);
      } else if (type === "number") {
        options = generateNumericBuckets(dataset, field.id, field.valueGetter);
      } else if (type === "date") {
        options = generateDateRanges(dataset, field.id, field.valueGetter);
      }
      data[field.id] = { type, options };
    }
    return data;
  }, [dataset, fields]);

  const updateDropdownPosition = useCallback(() => {
    if (!activeDropdown) {
      setDropdownPos(null);
      return;
    }
    const anchor = buttonRefs.current[activeDropdown];
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    const estimatedWidth = 260;
    if (left + estimatedWidth > window.innerWidth - VIEWPORT_GAP) {
      left = Math.max(VIEWPORT_GAP, window.innerWidth - estimatedWidth - VIEWPORT_GAP);
    }
    const estimatedHeight = 292;
    if (top + estimatedHeight > window.innerHeight - VIEWPORT_GAP) {
      top = Math.max(VIEWPORT_GAP, rect.top - estimatedHeight - 6);
    }
    setDropdownPos({ top, left });
  }, [activeDropdown]);

  useEffect(() => {
    if (!activeDropdown) {
      setDropdownPos(null);
      return;
    }
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [activeDropdown, updateDropdownPosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const element = target instanceof Element ? target : target.parentElement;
      
      const inDropdown = Boolean(dropdownPanelRef.current?.contains(target));
      const inDatePicker = Boolean(
        element?.closest(
          [
            "[data-portal]",
            "[data-mantine-portal]",
            "[data-dates-dropdown]",
            ".mantine-Popover-dropdown",
            ".mantine-DatePicker-dropdown",
            ".mantine-DateInput-dropdown",
            ".mantine-DatePickerInput-dropdown",
          ].join(", "),
        ),
      );

      if (!inDropdown && !inDatePicker) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, []);

  const getActiveArray = (val: string | string[] | undefined): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return typeof val === "string" && val.includes(",") ? val.split(",") : [val];
  };

  return (
    <div
      ref={containerRef}
      className="relative z-40 flex w-full items-center gap-2 rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-xs"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {quickFilters && quickFilters.map((qf) => {
          const isActive = activeQuickFilters?.includes(qf.id) || (qf.options && qf.options.some(opt => activeQuickFilters?.includes(opt.value)));
          const isOpen = activeDropdown === `quick_${qf.id}`;
          
          return (
            <div key={qf.id} className="relative">
              <button
                ref={(el) => { buttonRefs.current[`quick_${qf.id}`] = el; }}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-12 font-medium transition-all",
                  isActive || isOpen
                    ? "border-[var(--primary-9)] bg-[var(--primary-3)] text-[var(--primary-9)]"
                    : "border-[var(--border-default)] bg-surface text-[var(--text-secondary)] hover:bg-gray-3 dark:hover:bg-gray-10"
                )}
                onClick={() => {
                  if (qf.options) {
                    setActiveDropdown(isOpen ? null : `quick_${qf.id}`);
                  } else {
                    onQuickFilterToggle?.(qf.id);
                  }
                }}
              >
                {qf.icon && <Icon className="size-3.5" name={qf.icon} />}
                <span>{qf.label}</span>
                {qf.count !== undefined && (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full px-1.5 py-0.5 text-10 font-bold",
                      isActive
                        ? "bg-[var(--primary-4)] text-[var(--primary-9)]"
                        : "bg-gray-3 text-gray-11"
                    )}
                  >
                    {qf.count}
                  </span>
                )}
                {qf.options && (
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                )}
              </button>

              {isOpen && dropdownPos && createPortal(
                <div
                  ref={dropdownPanelRef}
                  className="fixed rounded-lg border border-border-default bg-surface shadow-md animate-in fade-in slide-in-from-top-2"
                  style={{
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    zIndex: FILTER_MENU_Z_INDEX,
                  }}
                >
                  <div className="flex w-56 flex-col gap-1 bg-surface p-2">
                    {qf.type === 'date' ? (
                      <DateFilterMenu
                        options={qf.options || []}
                        selectedValues={activeQuickFilters?.filter(f => f.startsWith(`${qf.id}:`)).map(f => f.replace(`${qf.id}:`, '')) || []}
                        onChange={(newValues) => {
                          const oldValues = activeQuickFilters?.filter(f => f.startsWith(`${qf.id}:`)).map(f => f.replace(`${qf.id}:`, '')) || [];
                          const added = newValues.filter(v => !oldValues.includes(v));
                          const removed = oldValues.filter(v => !newValues.includes(v));
                          
                          added.forEach(v => onQuickFilterToggle?.(`${qf.id}:${v}`));
                          removed.forEach(v => onQuickFilterToggle?.(`${qf.id}:${v}`));
                        }}
                        onClear={() => {
                          const oldValues = activeQuickFilters?.filter(f => f.startsWith(`${qf.id}:`)).map(f => f.replace(`${qf.id}:`, '')) || [];
                          oldValues.forEach(v => onQuickFilterToggle?.(`${qf.id}:${v}`));
                        }}
                      />
                    ) : (
                      <div className="ez-scrollbar flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
                        {qf.options?.map((opt) => {
                          const isSelected = activeQuickFilters?.includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              className={cn(
                                "flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-12 font-medium transition-colors hover:bg-gray-2",
                                isSelected && "bg-primary-3/30 text-primary-9"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="accent-primary-9"
                                  checked={isSelected}
                                  onChange={() => onQuickFilterToggle?.(opt.value)}
                                />
                                <span>{opt.label}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          );
        })}

        {fields.map((field) => {
          const { type, options } = fieldData[field.id] || { type: "unknown", options: [] };
          const activeValues = getActiveArray(activeFilters[field.id]);
          const isActive = activeValues.length > 0;
          const isOpen = activeDropdown === field.id;
          let displayLabel = field.label;
          let badgeCount = 0;
          if (activeValues.length === 1) {
            const opt = options.find(o => o.value === activeValues[0]);
            displayLabel = `${field.label}: ${opt ? opt.label : activeValues[0]}`;
          } else if (activeValues.length > 1) {
            const firstOpt = options.find(o => o.value === activeValues[0]);
            displayLabel = `${field.label}: ${firstOpt ? firstOpt.label : activeValues[0]}`;
            badgeCount = activeValues.length - 1;
          }

          return (
            <div key={field.id} className={cn("relative", isOpen && "z-[10000]")}>
              <div
                className={cn(
                  "flex max-w-[280px] items-center gap-1 rounded-full border py-1 pr-1.5 pl-3.5 text-12 font-medium transition-all",
                  isActive || isOpen
                    ? "border-primary-9 bg-primary-3/50 text-primary-9"
                    : "border-border-default bg-surface text-text-secondary"
                )}
              >
                <button
                  ref={(el) => { buttonRefs.current[field.id] = el; }}
                  className="flex min-w-0 cursor-pointer items-center gap-1.5 hover:opacity-80"
                  onClick={() => setActiveDropdown(isOpen ? null : field.id)}
                >
                  <span className="truncate">{displayLabel}</span>
                  {badgeCount > 0 && (
                    <span className="flex h-4 items-center justify-center rounded-full bg-primary-9 px-1.5 text-10 font-bold text-white shadow-sm">
                      +{badgeCount}
                    </span>
                  )}
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                </button>
              </div>

              {isOpen && dropdownPos && createPortal(
                <div
                  ref={dropdownPanelRef}
                  className="fixed rounded-lg border border-border-default bg-surface shadow-md animate-in fade-in slide-in-from-top-2"
                  style={{
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    zIndex: FILTER_MENU_Z_INDEX,
                  }}
                >
                  {type === "category" || type === "boolean" || type === "unknown" ? (
                    <CategoryFilterMenu
                      label={field.label}
                      options={options}
                      selectedValues={activeValues}
                      onChange={(vals) => onFilterChange(field.id, vals)}
                      onClear={() => {
                        onFilterChange(field.id, []);
                        setActiveDropdown(null);
                      }}
                    />
                  ) : type === "number" ? (
                    <NumberFilterMenu
                      options={options}
                      selectedValues={activeValues}
                      onChange={(vals) => onFilterChange(field.id, vals)}
                      onClear={() => {
                        onFilterChange(field.id, []);
                        setActiveDropdown(null);
                      }}
                    />
                  ) : type === "date" ? (
                    <DateFilterMenu
                      options={options}
                      selectedValues={activeValues}
                      onChange={(vals) => {
                        onFilterChange(field.id, vals);
                      }}
                      onClear={() => {
                        onFilterChange(field.id, []);
                        setActiveDropdown(null);
                      }}
                    />
                  ) : null}
                </div>,
                document.body
              )}
            </div>
          );
        })}

        {onClearAll && (
          // Check if any quick filters or dropdown filters are active
          ((activeQuickFilters && activeQuickFilters.length > 0) ||
            Object.values(activeFilters).some((v) =>
              Array.isArray(v) ? v.length > 0 : Boolean(v)
            )) && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 rounded-full border border-border-default bg-surface px-3 py-1.5 text-12 font-medium text-text-secondary transition-colors hover:bg-gray-2 hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        {customSearchComponent ? (
          customSearchComponent
        ) : onSearchChange ? (
          <div className="relative w-48">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              className="w-full rounded-md border border-border-default bg-surface py-1 pr-3 pl-8 text-12 outline-none transition-colors focus:border-primary-9"
              placeholder={searchPlaceholder}
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        ) : null}
        
        {toolbarActions && toolbarActions.length > 0 && (
          <FilterToolbar actions={toolbarActions} />
        )}
        
        {viewMode && onViewModeChange && (
          <div className="flex items-center gap-1 border-l border-border-default pl-2">
            <Tooltip content="Grid View">
              <button
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  viewMode === "grid" ? "bg-primary-3 text-primary-9" : "text-text-muted hover:bg-gray-2 hover:text-text-primary"
                )}
                onClick={() => onViewModeChange("grid")}
              >
                <Icon name="lucide:layout-grid" className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Table View">
              <button
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  viewMode === "table" ? "bg-primary-3 text-primary-9" : "text-text-muted hover:bg-gray-2 hover:text-text-primary"
                )}
                onClick={() => onViewModeChange("table")}
              >
                <Icon name="lucide:list" className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}

