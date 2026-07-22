import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import Icon from "@/components/base/icon/Icon";
import InputDate from "@/components/base/inputs/InputDate";
import Tooltip from "@/components/base/Tooltip";
import Button from "@/components/base/button/Button";
import IconButton from "@/components/base/button/IconButton";
import cn from "@/utils/cn";
import type { ButtonColor, ButtonVariant } from "@/components/base/button/types";

const MORE_FILTER_DEBOUNCE_MS = 350;
const MORE_FILTER_PANEL_WIDTH = 388;
const MORE_FILTER_PANEL_HEIGHT = 260;
/** Same layer as More filters panel; above toolbar/table content */
const FILTER_MENU_Z_INDEX = 50000;
const VIEWPORT_GAP = 8;
/** Multi-select value delimiter (must match folder multiFilterValues). */
const MULTI_FILTER_SEP = "||";

const splitMultiFilterValues = (value?: string | null): string[] => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return [];
  if (trimmed.includes(MULTI_FILTER_SEP)) {
    return trimmed
      .split(MULTI_FILTER_SEP)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [trimmed];
};

const joinMultiFilterValues = (values: string[]) =>
  values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(MULTI_FILTER_SEP);

const toggleMultiFilterValue = (
  current: string | null | undefined,
  value: string,
) => {
  const selected = splitMultiFilterValues(current);
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
  return joinMultiFilterValues(next);
};

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

const isDateFilterType = (dataType?: string) => {
  const normalized = String(dataType || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "date" ||
    normalized === "datetime" ||
    normalized.includes("date")
  );
};

/** Normalize picker value to API filter format: YYYY-MM-DDT00:00:00 */
const toApiDateFilterValue = (value: string | Date | null | undefined) => {
  if (value == null || value === "") return "";

  let parsed: Date | null = null;

  if (value instanceof Date) {
    parsed = value;
  } else {
    const trimmed = String(value).trim();
    if (!trimmed) return "";

    // ISO / YYYY-MM-DD
    parsed = new Date(trimmed);

    // DD-MMM-YYYY (InputDate display format)
    if (Number.isNaN(parsed.getTime())) {
      const match = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})$/);
      if (match) {
        parsed = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
      }
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return typeof value === "string" ? value.trim() : "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00`;
};

const formatDateChipLabel = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export interface QuickFilterOption {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  dataType?: string;
  options?: FilterOption[];
  actions?: FilterOption[]; // Used for buttons like High Value / Low Value
}

export interface FilterDefinition {
  id: string;
  label: string;
  options: FilterOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  width?: number;
}

export interface ActionButtonDef {
  id: string;
  label?: string;
  icon?: string;
  color?: ButtonColor;
  variant?: ButtonVariant;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  isIconButton?: boolean;
}

export interface CustomFilterProps {
  filters: FilterDefinition[];
  moreFilters?: FilterGroup[];
  moreFiltersLabel?: string;
  activeFilters: Record<string, string>;
  onFilterChange: (id: string, value: string) => void;
  /** Fired when a primary filter menu opens (`id`) or closes (`null`). */
  onFilterMenuOpenChange?: (id: string | null) => void;
  /** When true, primary filters use checkbox multi-select (menu stays open). */
  multiSelect?: boolean;
  onReset: () => void;
  showReset?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  customSearchComponent?: React.ReactNode;
  quickFilters?: QuickFilterOption[];
  activeQuickFilters?: string[];
  onQuickFilterToggle?: (id: string) => void;
  actionButtons?: ActionButtonDef[];
  viewMode?: "grid" | "table";
  onViewModeChange?: (mode: "grid" | "table") => void;
  trailingActions?: React.ReactNode;
  onBack?: () => void;
  addButton?: {
    onClick: () => void;
    label?: string;
    tooltip?: string;
    icon?: string;
  };
}

export default function CustomFilter({
  filters,
  moreFilters,
  moreFiltersLabel = "More filters",
  activeFilters,
  onFilterChange,
  onFilterMenuOpenChange,
  multiSelect = false,
  onReset,
  showReset,
  searchQuery = "",
  onSearchChange = () => {},
  searchPlaceholder = "Search...",
  customSearchComponent,
  quickFilters,
  activeQuickFilters,
  onQuickFilterToggle,
  actionButtons,
  viewMode,
  onViewModeChange,
  trailingActions,
  onBack,
  addButton,
}: CustomFilterProps) {
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<
    string | null
  >(null);
  const [activeFilterGroup, setActiveFilterGroup] = useState<string | null>(
    moreFilters && moreFilters.length > 0 ? moreFilters[0].id : null,
  );
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [morePanelPos, setMorePanelPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [filterDropdownPos, setFilterDropdownPos] =
    useState<DropdownPosition | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const moreFiltersButtonRef = useRef<HTMLButtonElement>(null);
  const moreFiltersPanelRef = useRef<HTMLDivElement>(null);
  const filterDropdownPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const morePanelAnchorRef = useRef<HTMLElement | null>(null);
  const skipMoreFilterDebounceRef = useRef(false);
  const previousFilterDropdownRef = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousFilterDropdownRef.current;
    const next =
      activeFilterDropdown && activeFilterDropdown !== "more"
        ? activeFilterDropdown
        : null;

    if (previous === next) return;

    previousFilterDropdownRef.current = next;
    onFilterMenuOpenChange?.(next);
  }, [activeFilterDropdown, onFilterMenuOpenChange]);

  const updateFilterDropdownPosition = useCallback(() => {
    if (!activeFilterDropdown || activeFilterDropdown === "more") {
      setFilterDropdownPos(null);
      return;
    }

    const anchor = filterButtonRefs.current[activeFilterDropdown];
    if (!anchor) return;

    const filter = filters.find((item) => item.id === activeFilterDropdown);
    const width = filter?.width || 240;
    const rect = anchor.getBoundingClientRect();

    let left = rect.left;
    let top = rect.bottom + 6;

    if (left + width > window.innerWidth - VIEWPORT_GAP) {
      left = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP);
    }

    const estimatedHeight = 292;
    if (top + estimatedHeight > window.innerHeight - VIEWPORT_GAP) {
      top = Math.max(VIEWPORT_GAP, rect.top - estimatedHeight - 6);
    }

    setFilterDropdownPos({ top, left, width });
  }, [activeFilterDropdown, filters]);

  const updateMorePanelPosition = useCallback(() => {
    const anchor = morePanelAnchorRef.current || moreFiltersButtonRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;

    if (left + MORE_FILTER_PANEL_WIDTH > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - MORE_FILTER_PANEL_WIDTH - 8);
    }
    if (top + MORE_FILTER_PANEL_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, rect.top - MORE_FILTER_PANEL_HEIGHT - 6);
    }

    setMorePanelPos({ left, top });
  }, []);

  const openMoreFilters = useCallback(
    (anchor: HTMLElement | null, groupId?: string | null) => {
      const nextGroup =
        groupId ||
        activeFilterGroup ||
        moreFilters?.find((group) => !activeFilters[group.id])?.id ||
        moreFilters?.[0]?.id ||
        null;

      morePanelAnchorRef.current = anchor;
      setActiveFilterGroup(nextGroup);
      setActiveFilterDropdown("more");
      skipMoreFilterDebounceRef.current = true;
      setFilterSearchQuery(nextGroup ? activeFilters[nextGroup] || "" : "");
    },
    [activeFilterGroup, activeFilters, moreFilters],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const element = target instanceof Element ? target : target.parentElement;
      const inBar = Boolean(filtersRef.current?.contains(target));
      const inPanel = Boolean(moreFiltersPanelRef.current?.contains(target));
      const inFilterDropdown = Boolean(
        filterDropdownPanelRef.current?.contains(target),
      );
      // Date picker / Mantine portals render outside the panel
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

      if (!inBar && !inPanel && !inFilterDropdown && !inDatePicker) {
        setActiveFilterDropdown(null);
      }
    }

    // Use click (not mousedown) so date selection onChange runs first
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, []);

  useEffect(() => {
    if (!activeFilterDropdown || activeFilterDropdown === "more") {
      setFilterDropdownPos(null);
      return;
    }

    updateFilterDropdownPosition();
    const onReposition = () => updateFilterDropdownPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [activeFilterDropdown, updateFilterDropdownPosition]);

  useEffect(() => {
    if (activeFilterDropdown !== "more") {
      setMorePanelPos(null);
      morePanelAnchorRef.current = null;
      return;
    }

    updateMorePanelPosition();
    const onReposition = () => updateMorePanelPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [activeFilterDropdown, updateMorePanelPosition]);

  useEffect(() => {
    if (activeFilterDropdown !== "more" || !activeFilterGroup) return;

    const activeGroup = moreFilters?.find(
      (group) => group.id === activeFilterGroup,
    );
    if (isDateFilterType(activeGroup?.dataType)) return;

    if (skipMoreFilterDebounceRef.current) {
      skipMoreFilterDebounceRef.current = false;
      return;
    }

    const trimmed = filterSearchQuery.trim();
    const current = String(activeFilters[activeFilterGroup] ?? "").trim();
    if (trimmed === current) return;

    const timer = window.setTimeout(() => {
      onFilterChange(activeFilterGroup, trimmed);
    }, MORE_FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeFilterDropdown,
    activeFilterGroup,
    activeFilters,
    filterSearchQuery,
    moreFilters,
    onFilterChange,
  ]);

  // Default filter dropdown: apply typed value when options are empty
  useEffect(() => {
    if (!activeFilterDropdown || activeFilterDropdown === "more") return;

    const activeFilter = filters.find(
      (filter) => filter.id === activeFilterDropdown,
    );
    if (!activeFilter?.searchable) return;
    if (activeFilter.options.length > 0) return;

    if (skipMoreFilterDebounceRef.current) {
      skipMoreFilterDebounceRef.current = false;
      return;
    }

    const trimmed = filterSearchQuery.trim();
    const current = String(activeFilters[activeFilterDropdown] ?? "").trim();
    if (trimmed === current) return;

    const timer = window.setTimeout(() => {
      onFilterChange(activeFilterDropdown, trimmed);
    }, MORE_FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeFilterDropdown,
    activeFilters,
    filterSearchQuery,
    filters,
    onFilterChange,
  ]);

  const moreFiltersPanel =
    activeFilterDropdown === "more" &&
    morePanelPos &&
    moreFilters &&
    moreFilters.length > 0
      ? createPortal(
          <div
            ref={moreFiltersPanelRef}
            className="fixed flex max-h-[260px] overflow-hidden rounded-lg border border-border-default bg-surface shadow-md animate-in fade-in zoom-in-95"
            style={{
              top: morePanelPos.top,
              left: morePanelPos.left,
              zIndex: FILTER_MENU_Z_INDEX,
            }}
          >
            <div className="ez-scrollbar flex max-h-[260px] w-[168px] flex-col overflow-y-auto border-r border-border-default bg-primary-3/30 p-1 dark:bg-gray-12">
              {moreFilters.map((group) => {
                const IconComp = group.icon;
                const isActive = activeFilterGroup === group.id;
                const hasValue = Boolean(activeFilters[group.id]);
                return (
                  <button
                    key={group.id}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-12 font-medium transition-all",
                      isActive
                        ? "bg-primary-3 text-primary-9 dark:bg-primary-9 dark:text-white"
                        : "text-text-secondary hover:bg-gray-2 dark:hover:bg-gray-10",
                      hasValue && !isActive && "text-primary-9",
                    )}
                    type="button"
                    onClick={() => {
                      setActiveFilterGroup(group.id);
                      skipMoreFilterDebounceRef.current = true;
                      setFilterSearchQuery(activeFilters[group.id] || "");
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {IconComp && (
                        <IconComp className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{group.label}</span>
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                  </button>
                );
              })}
            </div>

            <div className="ez-scrollbar flex max-h-[260px] w-[220px] flex-col gap-2 overflow-y-auto bg-surface p-2.5">
              {moreFilters.map((group) => {
                if (activeFilterGroup !== group.id) return null;

                if (isDateFilterType(group.dataType)) {
                  const dateValue = activeFilters[group.id] || null;
                  return (
                    <React.Fragment key={group.id}>
                      <div className="text-11 font-semibold text-text-muted">
                        Filter by {group.label}
                      </div>
                      <InputDate
                        className="w-full"
                        clearable
                        placeholder="Select date"
                        popoverProps={{
                          withinPortal: true,
                          zIndex: FILTER_MENU_Z_INDEX + 1,
                          middlewares: { flip: true, shift: true },
                        }}
                        value={dateValue}
                        onChange={(nextValue) => {
                          const apiValue = toApiDateFilterValue(
                            nextValue as string | Date | null,
                          );
                          if (!apiValue) {
                            skipMoreFilterDebounceRef.current = true;
                            setFilterSearchQuery("");
                            onFilterChange(group.id, "");
                            return;
                          }

                          skipMoreFilterDebounceRef.current = true;
                          setFilterSearchQuery(apiValue);
                          onFilterChange(group.id, apiValue);
                          // Close after apply so the value is committed first
                          window.setTimeout(() => {
                            setActiveFilterDropdown(null);
                          }, 0);
                        }}
                      />
                      {dateValue ? (
                        <button
                          className="w-full cursor-pointer rounded px-2 py-1.5 text-left text-12 font-medium text-text-secondary hover:bg-gray-2"
                          type="button"
                          onClick={() => {
                            skipMoreFilterDebounceRef.current = true;
                            setFilterSearchQuery("");
                            onFilterChange(group.id, "");
                            setActiveFilterDropdown(null);
                          }}
                        >
                          Clear {group.label}
                        </button>
                      ) : null}
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={group.id}>
                    {group.options && (
                      <>
                        <div className="relative">
                          <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                          <input
                            className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-7 text-11 text-text-primary outline-none"
                            placeholder={`Search ${group.label.toLowerCase()}...`}
                            type="text"
                            value={filterSearchQuery}
                            onChange={(e) =>
                              setFilterSearchQuery(e.target.value)
                            }
                          />
                        </div>
                        <div className="ez-scrollbar flex max-h-[180px] flex-col gap-0.5 overflow-y-auto">
                          <button
                            className={cn(
                              "w-full cursor-pointer rounded px-2 py-1.5 text-left text-12 font-medium text-text-primary transition-colors hover:bg-gray-2",
                              !activeFilters[group.id] &&
                                "bg-primary-3/30 font-semibold text-primary-9",
                            )}
                            type="button"
                            onClick={() => {
                              skipMoreFilterDebounceRef.current = true;
                              setFilterSearchQuery("");
                              onFilterChange(group.id, "");
                              setActiveFilterDropdown(null);
                            }}
                          >
                            All {group.label}
                          </button>
                          {group.options
                            .filter((item) =>
                              item.label
                                .toLowerCase()
                                .includes(filterSearchQuery.toLowerCase()),
                            )
                            .map((item) => (
                              <button
                                key={item.value}
                                className={cn(
                                  "w-full cursor-pointer rounded px-2 py-1.5 text-left text-12 font-medium transition-colors hover:bg-gray-2",
                                  activeFilters[group.id] === item.value
                                    ? "bg-primary-3/30 font-semibold text-primary-9"
                                    : "text-text-secondary",
                                )}
                                type="button"
                                onClick={() => {
                                  skipMoreFilterDebounceRef.current = true;
                                  setFilterSearchQuery(item.value);
                                  onFilterChange(group.id, item.value);
                                  setActiveFilterDropdown(null);
                                }}
                              >
                                {item.label}
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                    {group.actions && (
                      <>
                        <div className="mb-0.5 text-11 font-semibold text-text-muted">
                          Filter by {group.label}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {group.actions.map((action) => (
                            <button
                              key={action.value}
                              className="w-full cursor-pointer rounded px-2 py-1.5 text-left text-12 font-medium text-text-secondary hover:bg-gray-2"
                              type="button"
                              onClick={() => {
                                onFilterChange(group.id, action.value);
                                setActiveFilterDropdown(null);
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={filtersRef}
      className="relative z-40 flex w-full items-center gap-2 rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-xs"
    >
      {onBack && (
        <IconButton
          ariaLabel="Back"
          color="gray"
          icon="lucide:arrow-left"
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={onBack}
        />
      )}
      {/* Filters wrap onto new lines when they overflow */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {quickFilters &&
            quickFilters.map((qf) => {
              const isActive = activeQuickFilters?.includes(qf.id);
              return (
                <button
                  key={qf.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-12 font-medium transition-all",
                    isActive
                      ? "border-[var(--primary-9)] bg-[var(--primary-3)] text-[var(--primary-9)]"
                      : "border-[var(--border-default)] bg-surface text-[var(--text-secondary)] hover:bg-gray-3 dark:hover:bg-gray-10",
                  )}
                  onClick={() => onQuickFilterToggle?.(qf.id)}
                >
                  {qf.icon && <Icon className="size-3.5" name={qf.icon} />}
                  <span>{qf.label}</span>
                  {qf.count !== undefined && (
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-full px-1.5 py-0.5 text-10 font-bold",
                        isActive
                          ? "bg-[var(--primary-4)] text-[var(--primary-9)]"
                          : "bg-gray-3 text-gray-11",
                      )}
                    >
                      {qf.count}
                    </span>
                  )}
                </button>
              );
            })}

          {filters.map((filter) => {
            const activeValue = activeFilters[filter.id];
            const selectedValues = splitMultiFilterValues(activeValue);
            const activeOption = filter.options.find(
              (o) => o.value === activeValue,
            );
            const multiDisplay =
              selectedValues.length === 0
                ? ""
                : selectedValues.length === 1
                  ? filter.options.find((o) => o.value === selectedValues[0])
                      ?.label || selectedValues[0]
                  : `${selectedValues.length} selected`;
            const displayLabel = multiSelect
              ? multiDisplay
                ? `${filter.label} : ${multiDisplay}`
                : filter.label
              : activeOption
                ? `${filter.label} : ${activeOption.label}`
                : activeValue
                  ? `${filter.label} : ${activeValue}`
                  : filter.label;
            const isActive =
              !!activeValue || activeFilterDropdown === filter.id;

            return (
              <div
                key={filter.id}
                className={cn(
                  "relative",
                  activeFilterDropdown === filter.id && "z-[10000]",
                )}
              >
                <div
                  className={cn(
                    "flex max-w-[240px] items-center gap-1 rounded-full border py-1 pr-1.5 pl-3.5 text-12 font-medium transition-all",
                    isActive
                      ? "border-primary-9 bg-primary-3/50 text-primary-9"
                      : "border-border-default bg-surface text-text-secondary",
                  )}
                >
                  <button
                    ref={(node) => {
                      filterButtonRefs.current[filter.id] = node;
                    }}
                    className="flex min-w-0 cursor-pointer items-center gap-1.5 hover:opacity-80"
                    type="button"
                    onClick={() => {
                      const nextOpen =
                        activeFilterDropdown === filter.id ? null : filter.id;
                      setActiveFilterDropdown(nextOpen);
                      skipMoreFilterDebounceRef.current = true;
                      setFilterSearchQuery("");
                    }}
                  >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                  </button>
                  {activeValue ? (
                    <Tooltip content={`Clear ${filter.label}`}>
                      <button
                        aria-label={`Clear ${filter.label}`}
                        className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary-9 transition-colors hover:bg-primary-3"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFilterChange(filter.id, "");
                          if (activeFilterDropdown === filter.id) {
                            setActiveFilterDropdown(null);
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Tooltip>
                  ) : null}
                </div>

                {activeFilterDropdown === filter.id &&
                  filterDropdownPos &&
                  createPortal(
                    <div
                      ref={filterDropdownPanelRef}
                      className="fixed rounded-lg border border-border-default bg-surface p-3 shadow-md animate-in fade-in slide-in-from-top-2"
                      style={{
                        top: filterDropdownPos.top,
                        left: filterDropdownPos.left,
                        width: filterDropdownPos.width,
                        zIndex: FILTER_MENU_Z_INDEX,
                      }}
                    >
                      {filter.searchable && (
                        <>
                          <div className="relative mb-2">
                            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                            <input
                              className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                              placeholder={
                                filter.searchPlaceholder || "Search..."
                              }
                              type="text"
                              value={filterSearchQuery}
                              onChange={(e) =>
                                setFilterSearchQuery(e.target.value)
                              }
                            />
                          </div>
                          <div className="mx-[-12px] my-2 h-px bg-border-default" />
                        </>
                      )}
                      <div className="scrollbar flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
                        {!multiSelect ? (
                          <button
                            className={cn(
                              "w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-12 font-medium text-text-primary transition-colors hover:bg-gray-2",
                              !activeValue &&
                                "bg-primary-3/30 font-semibold text-primary-9",
                            )}
                            onClick={() => {
                              skipMoreFilterDebounceRef.current = true;
                              setFilterSearchQuery("");
                              onFilterChange(filter.id, "");
                              setActiveFilterDropdown(null);
                            }}
                          >
                            All {filter.label}
                          </button>
                        ) : null}
                        {(() => {
                          const visibleOptions = filter.options.filter(
                            (item) =>
                              filter.searchable && filterSearchQuery
                                ? item.label
                                    .toLowerCase()
                                    .includes(filterSearchQuery.toLowerCase())
                                : true,
                          );

                          if (visibleOptions.length === 0) {
                            const typed = filterSearchQuery.trim();
                            if (typed) {
                              return (
                                <button
                                  className="w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-12 font-medium text-primary-9 transition-colors hover:bg-primary-3/30"
                                  type="button"
                                  onClick={() => {
                                    skipMoreFilterDebounceRef.current = true;
                                    if (multiSelect) {
                                      onFilterChange(
                                        filter.id,
                                        toggleMultiFilterValue(
                                          activeValue,
                                          typed,
                                        ),
                                      );
                                      return;
                                    }
                                    onFilterChange(filter.id, typed);
                                    setActiveFilterDropdown(null);
                                  }}
                                >
                                  Apply &quot;{typed}&quot;
                                </button>
                              );
                            }

                            return (
                              <div className="px-2.5 py-2 text-12 text-text-muted">
                                Type to search or apply a value
                              </div>
                            );
                          }

                          if (multiSelect) {
                            return visibleOptions.map((item) => {
                              const isSelected = selectedValues.includes(
                                item.value,
                              );
                              return (
                                <label
                                  key={item.value}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-12 font-medium transition-colors hover:bg-gray-2",
                                    isSelected &&
                                      "bg-primary-3/30 text-primary-9",
                                  )}
                                >
                                  <input
                                    checked={isSelected}
                                    className="accent-primary-9"
                                    type="checkbox"
                                    onChange={() => {
                                      skipMoreFilterDebounceRef.current = true;
                                      onFilterChange(
                                        filter.id,
                                        toggleMultiFilterValue(
                                          activeValue,
                                          item.value,
                                        ),
                                      );
                                    }}
                                  />
                                  <span>{item.label}</span>
                                </label>
                              );
                            });
                          }

                          return visibleOptions.map((item) => (
                            <button
                              key={item.value}
                              className={cn(
                                "w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-12 font-medium text-text-primary transition-colors hover:bg-gray-2",
                                activeValue === item.value &&
                                  "bg-primary-3/30 font-semibold text-primary-9",
                              )}
                              onClick={() => {
                                skipMoreFilterDebounceRef.current = true;
                                setFilterSearchQuery(item.value);
                                onFilterChange(filter.id, item.value);
                                setActiveFilterDropdown(null);
                              }}
                            >
                              {item.label}
                            </button>
                          ));
                        })()}
                      </div>
                      {multiSelect && selectedValues.length > 0 ? (
                        <div className="pt-2">
                          <div className="mx-[-12px] mb-1 h-px bg-border-default" />
                          <button
                            className="w-full rounded px-2.5 py-1.5 text-left text-12 font-medium text-text-secondary hover:bg-gray-2"
                            type="button"
                            onClick={() => {
                              skipMoreFilterDebounceRef.current = true;
                              onFilterChange(filter.id, "");
                              setActiveFilterDropdown(null);
                            }}
                          >
                            Clear Selection
                          </button>
                        </div>
                      ) : null}
                    </div>,
                    document.body,
                  )}
              </div>
            );
          })}

          {moreFilters
            ?.filter((group) => Boolean(activeFilters[group.id]))
            .map((group) => {
              const value = activeFilters[group.id];
              const isOpen =
                activeFilterDropdown === "more" &&
                activeFilterGroup === group.id;

              return (
                <div key={`chip-${group.id}`} className="relative">
                  <div className="flex max-w-[260px] items-center gap-1 rounded-full border border-primary-9 bg-primary-3/50 py-1 pr-1.5 pl-3.5 text-12 font-medium text-primary-9">
                    <button
                      className="flex min-w-0 cursor-pointer items-center gap-1.5 hover:opacity-80"
                      type="button"
                      onClick={(event) => {
                        if (isOpen) {
                          setActiveFilterDropdown(null);
                          return;
                        }
                        openMoreFilters(event.currentTarget, group.id);
                      }}
                    >
                      <span className="truncate">
                        {group.label} :{" "}
                        {isDateFilterType(group.dataType)
                          ? formatDateChipLabel(value)
                          : value}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                    </button>
                    <Tooltip content={`Clear ${group.label}`}>
                      <button
                        aria-label={`Clear ${group.label}`}
                        className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary-9 transition-colors hover:bg-primary-3"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          skipMoreFilterDebounceRef.current = true;
                          setFilterSearchQuery("");
                          onFilterChange(group.id, "");
                          if (isOpen) setActiveFilterDropdown(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}

          {moreFilters && moreFilters.length > 0 && (
            <Tooltip content={moreFiltersLabel || "More filters"}>
              <button
                ref={moreFiltersButtonRef}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center justify-center h-[30px] w-[30px] rounded-full border border-dashed transition-all",
                  activeFilterDropdown === "more"
                    ? "border-[var(--primary-6)] bg-[var(--primary-1)] text-[var(--primary-9)]"
                    : "border-[var(--gray-6)] text-[var(--gray-10)] bg-transparent hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]",
                )}
                type="button"
                onClick={() => {
                  if (activeFilterDropdown === "more") {
                    setActiveFilterDropdown(null);
                    return;
                  }
                  openMoreFilters(moreFiltersButtonRef.current);
                }}
              >
                <Icon name="tabler:plus" className="h-4 w-4" />
              </button>
            </Tooltip>
          )}

          {showReset && (
            <button
              className="shrink-0 cursor-pointer rounded-full border border-border-default bg-gray-2 px-3.5 py-1 text-12 font-medium text-text-secondary transition-all hover:bg-gray-3"
              type="button"
              onClick={() => {
                onReset();
                setFilterSearchQuery("");
                setActiveFilterDropdown(null);
              }}
            >
              Reset
            </button>
          )}
      </div>

      {/* Actions stay vertically centered while filters wrap */}
      <div className="flex shrink-0 items-center justify-end gap-1.5 self-center">
        {customSearchComponent ? (
          customSearchComponent
        ) : (
          <div
            className={cn(
              'flex h-8 items-center rounded-md border transition-all duration-300 select-none focus-within:border-primary-6',
              isSearchExpanded || searchQuery
                ? 'justify-start border-[var(--border-default)] bg-surface pr-1 pl-3 w-72'
                : 'w-8 cursor-pointer justify-center border-[var(--border-default)] bg-surface text-gray-11 hover:bg-gray-4 hover:text-gray-12 active:scale-95',
            )}
            onClick={() => {
              if (!isSearchExpanded && !searchQuery) {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }
            }}
          >
            <Tooltip content="Search" disabled={isSearchExpanded || !!searchQuery}>
              <div className='flex shrink-0 items-center gap-1.5'>
                <Icon
                  name='lucide:search'
                  className={cn(
                    'size-4 shrink-0 transition-colors',
                    isSearchExpanded || searchQuery ? 'text-gray-11' : 'text-gray-11 hover:text-gray-12',
                  )}
                />
              </div>
            </Tooltip>

            <div
              className={cn(
                'h-full transition-[width] duration-300',
                isSearchExpanded || searchQuery ? 'w-full flex-1' : 'w-0 flex-none overflow-hidden',
              )}
            >
              <input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                type='text'
                value={searchQuery}
                className={cn(
                  'h-full w-full border-0 bg-transparent px-2 text-13 font-medium text-[var(--gray-13)] outline-none placeholder:text-[var(--gray-8)]',
                  isSearchExpanded || searchQuery ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => {
                  // Only collapse if there's no query
                  if (!searchQuery) setIsSearchExpanded(false);
                }}
              />
            </div>
          </div>
        )}

        {viewMode && onViewModeChange && (
          <div className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--gray-1)] p-1 ml-1">
            <Tooltip content="Grid View" openDelay={500}>
              <button
                type="button"
                className={cn(
                  "cursor-pointer rounded-md px-2 py-1 transition-all duration-200",
                  viewMode === "grid"
                    ? "bg-surface text-[var(--primary-9)] shadow-sm"
                    : "text-[var(--gray-10)] hover:text-[var(--gray-12)]"
                )}
                onClick={() => onViewModeChange("grid")}
              >
                <Icon className="size-4" name="tabler:layout-grid" />
              </button>
            </Tooltip>
            <Tooltip content="Table View" openDelay={500}>
              <button
                type="button"
                className={cn(
                  "cursor-pointer rounded-md px-2 py-1 transition-all duration-200",
                  viewMode === "table"
                    ? "bg-surface text-[var(--primary-9)] shadow-sm"
                    : "text-[var(--gray-10)] hover:text-[var(--gray-12)]"
                )}
                onClick={() => onViewModeChange("table")}
              >
                <Icon className="size-4" name="tabler:table" />
              </button>
            </Tooltip>
          </div>
        )}

        {actionButtons && actionButtons.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 ml-1">
            {actionButtons.map((btn) => {
              const btnEl = btn.isIconButton ? (
                <IconButton
                  key={btn.id}
                  color={(btn.color as any) || "gray"}
                  variant={btn.variant || "outline"}
                  icon={btn.icon!}
                  aria-label={btn.tooltip || btn.label || btn.id}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                />
              ) : (
                <Button
                  key={btn.id}
                  color={btn.color || "primary"}
                  variant={btn.variant || "solid"}
                  icon={btn.icon}
                  label={btn.label}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  size="md"
                />
              );

              return btn.tooltip ? (
                <Tooltip key={btn.id} content={btn.tooltip}>
                  {btnEl}
                </Tooltip>
              ) : (
                btnEl
              );
            })}
          </div>
        )}

        {trailingActions ? (
          <div className="flex shrink-0 items-center gap-1.5 ml-1">
            {trailingActions}
          </div>
        ) : null}

        {addButton && (
          <div className="flex shrink-0 items-center ml-1">
            {addButton.tooltip ? (
              <Tooltip content={addButton.tooltip}>
                {addButton.label ? (
                  <Button
                    color="primary"
                    variant="solid"
                    suffixIcon={addButton.icon || "lucide:plus"}
                    label={addButton.label}
                    onClick={addButton.onClick}
                    size="md"
                  />
                ) : (
                  <IconButton
                    color="primary"
                    variant="solid"
                    icon={addButton.icon || "lucide:plus"}
                    ariaLabel={addButton.tooltip}
                    onClick={addButton.onClick}
                    size="md"
                  />
                )}
              </Tooltip>
            ) : (
              addButton.label ? (
                <Button
                  color="primary"
                  variant="solid"
                  suffixIcon={addButton.icon || "lucide:plus"}
                  label={addButton.label}
                  onClick={addButton.onClick}
                  size="md"
                />
              ) : (
                <IconButton
                  color="primary"
                  variant="solid"
                  icon={addButton.icon || "lucide:plus"}
                  ariaLabel="Add"
                  onClick={addButton.onClick}
                  size="md"
                />
              )
            )}
          </div>
        )}
      </div>

      {moreFiltersPanel}
    </div>
  );
}