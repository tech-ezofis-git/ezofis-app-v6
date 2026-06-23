import {
  useMemo,
  useState,
  type Dispatch,
  type ElementType,
  type SetStateAction,
} from "react";
import {
  Check,
  ChevronRight,
  Cloud,
  Database,
  Folder,
  GripVertical,
  HardDrive,
  Link2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import DataTable from "@/components/base/data-table/DataTable";
import InputText from "@/components/base/inputs/InputText";
import InputSelect from "@/components/base/inputs/InputSelect";
import IconButton from "@/components/base/button/IconButton";

type RepositoryStatus = "active" | "archived";
type WizardStep = 1 | 2 | 3 | 4 | 5;

type SelectOption = {
  id: string | number;
  name: string;
  description?: string;
  disabled?: boolean;
  value?: string;
};

type RepositoryRow = {
  id: number;
  name: string;
  owner: string;
  category: string;
  storage: string;
  documents: number;
  versioning: string;
  status: RepositoryStatus;
};

type FieldRow = {
  id: string;
  fieldName: string;
  type: string;
  system?: boolean;
  mandatory: boolean;
  searchable: boolean;
  showInList: boolean;
  ocrExtract: boolean;
  syncField: boolean;
};

type WizardStepItem = {
  id: WizardStep;
  title: string;
  description: string;
};

type DmsFolderConfigurationProps = {
  onBack?: () => void;
};

const repositories: RepositoryRow[] = [
  {
    id: 1,
    name: "AP Invoices",
    owner: "John Smith",
    category: "Invoices",
    storage: "Default",
    documents: 1250,
    versioning: "Incremental Versioning",
    status: "active",
  },
  {
    id: 2,
    name: "Purchase Orders",
    owner: "Sarah Miller",
    category: "Purchase Orders",
    storage: "Azure",
    documents: 840,
    versioning: "Timestamp Versioning",
    status: "active",
  },
  {
    id: 3,
    name: "Vendor Contracts",
    owner: "Mike Johnson",
    category: "Contracts",
    storage: "OneDrive",
    documents: 320,
    versioning: "Incremental Versioning",
    status: "active",
  },
  {
    id: 4,
    name: "Compliance Docs",
    owner: "Lisa Chen",
    category: "Compliance",
    storage: "Default",
    documents: 2195,
    versioning: "Replace Existing",
    status: "active",
  },
  {
    id: 5,
    name: "Old Receipts",
    owner: "Tom Wilson",
    category: "Receipts",
    storage: "Default",
    documents: 0,
    versioning: "Incremental Versioning",
    status: "archived",
  },
];

const defaultFields: FieldRow[] = [
  {
    id: "invoiceNumber",
    fieldName: "Invoice Number",
    type: "Text",
    system: true,
    mandatory: true,
    searchable: true,
    showInList: true,
    ocrExtract: true,
    syncField: true,
  },
  {
    id: "vendorName",
    fieldName: "Vendor Name",
    type: "Text",
    system: true,
    mandatory: true,
    searchable: true,
    showInList: true,
    ocrExtract: true,
    syncField: false,
  },
  {
    id: "invoiceDate",
    fieldName: "Invoice Date",
    type: "Date",
    system: true,
    mandatory: true,
    searchable: true,
    showInList: true,
    ocrExtract: true,
    syncField: false,
  },
  {
    id: "poNumber",
    fieldName: "PO Number",
    type: "Text",
    system: true,
    mandatory: false,
    searchable: true,
    showInList: true,
    ocrExtract: true,
    syncField: true,
  },
  {
    id: "amount",
    fieldName: "Amount",
    type: "Currency",
    system: true,
    mandatory: true,
    searchable: false,
    showInList: true,
    ocrExtract: true,
    syncField: true,
  },
];

const wizardSteps: WizardStepItem[] = [
  { id: 1, title: "Folder Details", description: "Name, owner and category" },
  { id: 2, title: "Storage", description: "Select storage provider" },
  { id: 3, title: "Fields", description: "Configure metadata fields" },
  { id: 4, title: "Versioning", description: "File version strategy" },
  { id: 5, title: "Integrations", description: "ERP and sync mapping" },
];

const categoryOptions: SelectOption[] = [
  { id: "General", name: "General", value: "General" },
  { id: "Invoices", name: "Invoices", value: "Invoices" },
  { id: "Contracts", name: "Contracts", value: "Contracts" },
];

const storageOptions = [
  {
    id: "Default Drive",
    icon: HardDrive,
    title: "Default Drive",
    subtitle: "Built-in secure storage",
  },
  {
    id: "Azure Blob Storage",
    icon: Cloud,
    title: "Azure Blob Storage",
    subtitle: "Microsoft Azure cloud",
  },
  {
    id: "OneDrive",
    icon: Cloud,
    title: "OneDrive",
    subtitle: "Microsoft OneDrive",
  },
  {
    id: "Google Drive",
    icon: Cloud,
    title: "Google Drive",
    subtitle: "Google Workspace",
  },
  {
    id: "Amazon S3",
    icon: Database,
    title: "Amazon S3",
    subtitle: "AWS S3 bucket",
  },
];

const versionOptions = [
  {
    id: "Replace Existing",
    title: "Replace Existing",
    subtitle: "New uploads replace the existing file",
    sample: "Invoice.pdf → Invoice.pdf",
  },
  {
    id: "Timestamp Version",
    title: "Timestamp Version",
    subtitle: "Append timestamp to each version",
    sample: "Invoice.pdf → Invoice_20260101_1000.pdf",
  },
  {
    id: "Incremental Version",
    title: "Incremental Version",
    subtitle: "Auto-increment version number",
    sample: "Invoice.pdf → Invoice_1.pdf → Invoice_2.pdf",
  },
];

const integrations = [
  "SAP",
  "Oracle ERP",
  "Microsoft Dynamics",
  "QuickBooks",
  "Custom API",
];
const defaultHierarchy = ["Root", "Year", "Month", "Vendor"];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 rounded-full transition",
        checked ? "bg-[#7C5CFF]" : "bg-[#E6EAF0]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
          checked ? "left-[18px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function RepositoryTable({ rows }: { rows: RepositoryRow[] }) {
  const columnHelper = createColumnHelper<RepositoryRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Repository",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#F0E8FF] text-[#7C5CFF]">
              <Folder size={21} />
            </div>
            <div>
              <div className="font-semibold text-[#07142B]">
                {row.original.name}
              </div>
              <div className="text-xs text-[#526987]">
                Owner: {row.original.owner}
              </div>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="rounded-lg border border-gray-3 px-3 py-1 text-xs font-medium">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("storage", {
        header: "Storage",
        cell: (info) => (
          <span className="rounded-lg border border-gray-3 px-3 py-1 text-xs font-medium">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("documents", {
        header: "Documents",
        cell: (info) => `${info.getValue().toLocaleString()} documents`,
      }),
      columnHelper.accessor("versioning", {
        header: "Versioning",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-semibold capitalize",
              info.getValue() === "active"
                ? "bg-[#7C5CFF] text-white"
                : "bg-[#F1F4F8] text-[#07142B]",
            )}
          >
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [columnHelper],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      pageSize={rows.length || 5}
      stickyHeader
      component={<div />}
      isReLoading={false}
      onReload={() => undefined}
    />
  );
}

function FieldsTable({
  fields,
  setFields,
}: {
  fields: FieldRow[];
  setFields: Dispatch<SetStateAction<FieldRow[]>>;
}) {
  const updateField = (id: string, key: keyof FieldRow) => {
    setFields((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, [key]: !field[key] } : field,
      ),
    );
  };

  return (
    <div className="overflow-x-auto rounded-[12px] border border-gray-3 bg-white">
      <table className="w-full min-w-[850px] text-sm">
        <thead className="bg-[#F8FAFC] text-left text-[#07142B]">
          <tr>
            <th className="w-10 px-4 py-4" />
            <th className="px-4 py-4">Field Name</th>
            <th className="px-4 py-4">Type</th>
            <th className="px-4 py-4 text-center">Mandatory</th>
            <th className="px-4 py-4 text-center">Searchable</th>
            <th className="px-4 py-4 text-center">Show in List</th>
            <th className="px-4 py-4 text-center">OCR Extract</th>
            <th className="px-4 py-4 text-center">Sync Field</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.id} className="border-t border-gray-3">
              <td className="px-4 py-4 text-[#A8B3C2]">
                <GripVertical size={16} />
              </td>
              <td className="px-4 py-4">
                <div className="font-semibold text-[#07142B]">
                  {field.fieldName}
                </div>
                {field.system && (
                  <span className="mt-1 inline-flex rounded-md border border-gray-3 px-2 py-0.5 text-[11px]">
                    System
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-[#526987]">{field.type}</td>
              {(
                [
                  "mandatory",
                  "searchable",
                  "showInList",
                  "ocrExtract",
                  "syncField",
                ] as Array<keyof FieldRow>
              ).map((key) => (
                <td key={key} className="px-4 py-4 text-center">
                  <Toggle
                    checked={Boolean(field[key])}
                    onChange={() => updateField(field.id, key)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function StepIcon({ step }: { step: WizardStep }) {
  return <span className="text-xs font-bold">{step}</span>;
}

type SortableHierarchyItemProps = {
  item: string;
};

function SortableHierarchyItem({ item }: SortableHierarchyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-[9px] border border-[#EEF2F7] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[#07142B] shadow-sm transition",
        isDragging && "z-50 opacity-80 shadow-lg",
      )}
    >
      <button
        type="button"
        className="flex cursor-grab items-center text-[#71839B] outline-none active:cursor-grabbing"
        aria-label={`Drag ${item}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <span className="truncate">{item}</span>
    </div>
  );
}

function StepNav({
  step,
  setStep,
  folderHierarchy,
  setFolderHierarchy,
}: {
  step: WizardStep;
  setStep: (step: WizardStep) => void;
  folderHierarchy: string[];
  setFolderHierarchy: Dispatch<SetStateAction<string[]>>;
}) {
  const [newLevel, setNewLevel] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setFolderHierarchy((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));

      if (oldIndex === -1 || newIndex === -1) return items;

      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleAddLevel = () => {
    const value = newLevel.trim();

    if (!value) return;

    const alreadyExists = folderHierarchy.some(
      (item) => item.toLowerCase() === value.toLowerCase(),
    );

    if (alreadyExists) {
      setNewLevel("");
      return;
    }

    setFolderHierarchy((prev) => [...prev, value]);
    setNewLevel("");
  };

  return (
    <div className="h-full w-[310px] shrink-0 border-r border-gray-3 bg-surface p-5">
      <div className="relative pb-2">
        {wizardSteps.map((item, index) => {
          const isCompleted = step > item.id;
          const isActive = step === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={cn(
                "group flex w-full items-center gap-4 rounded-[14px] px-3 py-3 text-left transition",
                isActive && "",
              )}
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]">
                {index < wizardSteps.length - 1 && (
                  <span className="absolute left-1/2 top-8 h-12 w-[1.5px] -translate-x-1/2 bg-[var(--gray-3)]" />
                )}

                <span
                  className={cn(
                    "z-10 flex h-8 w-8 items-center justify-center rounded-full transition",
                    isCompleted
                      ? "bg-[#EFEAFF] text-[#7C5CFF]"
                      
                        : "bg-[var(--gray-3)] text-[var(--gray-10)]",
                  )}
                >
                  {isCompleted ? (
                    <Check size={14} />
                  ) : (
                    <StepIcon step={item.id} />
                  )}
                </span>
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--indigo-12)]">
                  {item.title}
                </div>
                <div className="mt-0.5 truncate text-xs text-[#526987]">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 pb-5 border-t border-gray-3 pt-4">
        <div className="mb-3 text-xs font-bold uppercase text-[#526987]">
          Folder Hierarchy
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={folderHierarchy}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 bg-gray-50/50 rounded-md">
              {folderHierarchy.map((item) => (
                <SortableHierarchyItem key={item} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-2 flex gap-1">
          <input
            value={newLevel}
            onChange={(event) => setNewLevel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddLevel();
              }
            }}
            className="h-8 flex-1 rounded-md border border-gray-3 px-2 text-xs outline-none"
            placeholder="Add level..."
          />
          <button
            type="button"
            onClick={handleAddLevel}
            className="h-8 w-8 rounded-md bg-[#7C5CFF] text-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function WizardContent({
  step,
  folderName,
  setFolderName,
  description,
  setDescription,
  category,
  setCategory,
  folderOwner,
  setFolderOwner,
  folderCoordinator,
  setFolderCoordinator,
  storage,
  setStorage,
  fields,
  setFields,
  versioning,
  setVersioning,
  displayMode,
  setDisplayMode,
}: {
  step: WizardStep;
  folderName: string;
  setFolderName: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  category: SelectOption;
  setCategory: Dispatch<SetStateAction<SelectOption>>;
  folderOwner: string;
  setFolderOwner: Dispatch<SetStateAction<string>>;
  folderCoordinator: string;
  setFolderCoordinator: Dispatch<SetStateAction<string>>;
  storage: string;
  setStorage: Dispatch<SetStateAction<string>>;
  fields: FieldRow[];
  setFields: Dispatch<SetStateAction<FieldRow[]>>;
  versioning: string;
  setVersioning: Dispatch<SetStateAction<string>>;
  displayMode: string;
  setDisplayMode: Dispatch<SetStateAction<string>>;
}) {
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("Alphanumeric");

  const addField = () => {
    const trimmedName = newFieldName.trim();
    if (!trimmedName) return;

    setFields((prev) => [
      ...prev,
      {
        id: `${trimmedName}-${Date.now()}`,
        fieldName: trimmedName,
        type: newFieldType,
        mandatory: false,
        searchable: true,
        showInList: true,
        ocrExtract: false,
        syncField: false,
      },
    ]);
    setNewFieldName("");
    setNewFieldType("Alphanumeric");
  };

  if (step === 1) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-[#526987]">
          Define the basic information for your document repository.
        </p>

        <InputText
          label="Folder Name *"
          placeholder="e.g. AP Invoices 2026"
          value={folderName}
          onChange={(value: string) => setFolderName(value)}
        />

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#07142B]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[72px] w-full rounded-[10px] border border-gray-3 px-3 py-2 text-sm outline-none"
            placeholder="Describe the purpose of this repository..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#07142B]">
            Category
          </label>
          <InputSelect
            value={category}
            options={categoryOptions}
            onChange={(item: SelectOption | null) => {
              if (!item) return;
              setCategory(item);
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputText
            label="Folder Owner"
            placeholder="Owner name or email"
            value={folderOwner}
            onChange={(value: string) => setFolderOwner(value)}
          />

          <InputText
            label="Folder Coordinator"
            placeholder="Coordinator name or email"
            value={folderCoordinator}
            onChange={(value: string) => setFolderCoordinator(value)}
          />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div>
        <p className="mb-5 text-sm text-[#526987]">
          Choose where documents in this repository will be stored.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {storageOptions.map((item) => {
            const Icon = item.icon as ElementType;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStorage(item.id)}
                className={cn(
                  "flex items-center gap-4 rounded-[12px] border p-4 text-left transition",
                  storage === item.id
                    ? "border-[#7C5CFF] bg-[#F7F3FF]"
                    : "border-gray-3 bg-white hover:bg-[#FAFBFD]",
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EEF2F7] text-[#526987]">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-[#07142B]">
                    {item.title}
                  </span>
                  <span className="text-sm text-[#526987]">
                    {item.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[#07142B]">
              Document Fields Configuration
            </h3>
            <p className="text-sm text-[#526987]">
              Configure metadata fields. Mark each as OCR Extract or Sync field.
            </p>
          </div>
          <div className="flex gap-4 text-sm text-[#526987]">
            <span>
              <RefreshCw size={13} className="inline" /> OCR Extract
            </span>
            <span>
              <RefreshCw size={13} className="inline" /> Sync Field
            </span>
          </div>
        </div>

        <div className="rounded-[12px] border border-gray-3 bg-[#FAFBFD] p-4">
          <div className="mb-3 text-xs font-bold uppercase text-[#526987]">
            Add New Field
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_160px]">
            <input
              value={newFieldName}
              onChange={(event) => setNewFieldName(event.target.value)}
              className="h-10 rounded-[10px] border border-gray-3 px-3 text-sm outline-none"
              placeholder="e.g. Cost Center"
            />
            <select
              value={newFieldType}
              onChange={(event) => setNewFieldType(event.target.value)}
              className="h-10 rounded-[10px] border border-gray-3 px-3 text-sm outline-none"
            >
              <option>Alphanumeric</option>
              <option>Date</option>
              <option>Currency</option>
            </select>
            <button
              type="button"
              onClick={addField}
              className="rounded-[10px] bg-[#7C5CFF] font-semibold text-white"
            >
              <Plus className="inline" size={16} /> Add Field
            </button>
          </div>
        </div>

        <FieldsTable fields={fields} setFields={setFields} />
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-[#526987]">
          Choose how document versions are managed in this repository.
        </p>
        <h3 className="font-bold text-[#07142B]">Version Strategy</h3>
        {versionOptions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setVersioning(item.id)}
            className={cn(
              "block w-full rounded-[12px] border p-4 text-left transition",
              versioning === item.id
                ? "border-[#7C5CFF] bg-[#F7F3FF]"
                : "border-gray-3 hover:bg-[#FAFBFD]",
            )}
          >
            <div className="font-semibold text-[#07142B]">{item.title}</div>
            <div className="text-sm text-[#526987]">{item.subtitle}</div>
            <code className="mt-2 inline-block rounded bg-[#F1F4F8] px-2 py-1 text-xs">
              {item.sample}
            </code>
          </button>
        ))}

        <h3 className="font-bold text-[#07142B]">Display Settings</h3>
        {[
          "Show Latest Version Only",
          "Show All Versions",
          "Version History Panel",
        ].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDisplayMode(item)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition",
              displayMode === item
                ? "border-[#7C5CFF] bg-[#F7F3FF]"
                : "border-gray-3 hover:bg-[#FAFBFD]",
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full border",
                displayMode === item
                  ? "border-[#7C5CFF] bg-[#7C5CFF]"
                  : "border-[#7C5CFF] bg-white",
              )}
            />
            {item}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-5 text-sm text-[#526987]">
        Connect external ERP or business systems and map repository fields for
        synchronization.
      </p>
      <div className="mb-3 text-xs font-bold uppercase text-[#526987]">
        Available Connections
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {integrations.map((item) => (
          <div
            key={item}
            className="rounded-[10px] border border-gray-3 p-3"
          >
            <div className="mb-3 font-semibold text-[#07142B]">{item}</div>
            <button
              type="button"
              className="flex h-8 w-full items-center justify-center gap-2 rounded-[8px] border border-gray-3 text-sm font-semibold hover:bg-[#FAFBFD]"
            >
              <Link2 size={14} /> Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DmsFolderConfiguration({
  onBack,
}: DmsFolderConfigurationProps) {
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [fields, setFields] = useState<FieldRow[]>(defaultFields);
  const [folderHierarchy, setFolderHierarchy] =
    useState<string[]>(defaultHierarchy);
  const [storage, setStorage] = useState("Default Drive");
  const [versioning, setVersioning] = useState("Incremental Version");
  const [displayMode, setDisplayMode] = useState("Show Latest Version Only");
  const [folderName, setFolderName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SelectOption>(categoryOptions[0]);
  const [folderOwner, setFolderOwner] = useState("");
  const [folderCoordinator, setFolderCoordinator] = useState("");

  const filteredRepositories = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return repositories;

    return repositories.filter((repo) =>
      `${repo.name} ${repo.owner} ${repo.category} ${repo.storage}`
        .toLowerCase()
        .includes(value),
    );
  }, [search]);

  const goNext = () => setStep((prev) => Math.min(5, prev + 1) as WizardStep);
  const goBack = () => setStep((prev) => Math.max(1, prev - 1) as WizardStep);

  const closeWizard = () => {
    setShowWizard(false);
    setStep(1);
  };

  const handleCreateRepository = () => {
    const payload = {
      folderName,
      description,
      category: category.name,
      folderOwner,
      folderCoordinator,
      storage,
      versioning,
      displayMode,
      folderHierarchy,
      fields,
    };

    console.log("Repository payload:", payload);
    closeWizard();
  };

  return (
    <div className="min-h-[90vh] ">
      <div className="flex items-center justify-between gap-6 border-b border-gray-3 bg-surface px-6 py-4 md:px-8">
        <div className="flex items-start gap-3">
          <IconButton
            ariaLabel="Back"
            color="gray"
            icon="lucide:arrow-left"
            size="sm"
            variant="ghost"
            onClick={onBack}
          />

          <div>
            <h1 className="text-18/6 font-semibold tracking-tight text-gray-13">
              DMS & Folder Configuration
            </h1>
            <p className="text-13/5 text-gray-11">
              Create and manage document repositories. No IT assistance
              required.
            </p>
          </div>
        </div>

        {!showWizard && (
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-[10px] bg-[#7C5CFF] px-5 py-3 font-semibold text-white shadow-md"
          >
            <Plus size={18} />
            New Repository
          </button>
        )}
      </div>

      {!showWizard ? (
        <div className="px-6 py-4">
          <div className="mb-4 mt-4 flex justify-end">
            <div className="relative w-full max-w-xl">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#526987]"
                size={20}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search repositories..."
                className="h-11 w-full rounded-[10px] border border-gray-3 bg-white pl-12 pr-4 text-sm shadow-sm outline-none"
              />
            </div>
          </div>

          <RepositoryTable rows={filteredRepositories} />
        </div>
      ) : (
        <div className="bg-surface">
          <div className="flex">
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <StepNav
                step={step}
                setStep={setStep}
                folderHierarchy={folderHierarchy}
                setFolderHierarchy={setFolderHierarchy}
              />
            </div>
            <div className="flex-1 p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <WizardContent
                step={step}
                folderName={folderName}
                setFolderName={setFolderName}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                folderOwner={folderOwner}
                setFolderOwner={setFolderOwner}
                folderCoordinator={folderCoordinator}
                setFolderCoordinator={setFolderCoordinator}
                storage={storage}
                setStorage={setStorage}
                fields={fields}
                setFields={setFields}
                versioning={versioning}
                setVersioning={setVersioning}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-3 px-6 py-4">
            {step === 1 ? (
              <button
                type="button"
                onClick={closeWizard}
                className="rounded-[8px] border border-gray-3 px-5 py-2 font-semibold"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={goBack}
                className="rounded-[8px] border border-gray-3 px-5 py-2 font-semibold"
              >
                Back
              </button>
            )}

            <div className="flex items-center gap-4">
              <span className="text-sm text-[#526987]">Step {step} of 5</span>
              <button
                type="button"
                onClick={step === 5 ? handleCreateRepository : goNext}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#7C5CFF] px-5 py-2 font-semibold text-white"
              >
                {step === 5 ? "Create Repository" : "Continue"}
                {step !== 5 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
