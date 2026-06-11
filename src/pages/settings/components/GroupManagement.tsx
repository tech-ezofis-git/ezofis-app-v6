import { Search, Plus, UsersRound, UserPlus, Pencil } from 'lucide-react';
import IconButton from '@/components/base/button/IconButton'

const groups = [
  {
    id: 1,
    name: 'Auditors',
    description: 'Internal and external audit team',
    members: 4,
    extra: 0,
  },
  {
    id: 2,
    name: 'Management',
    description: 'Senior management and executives',
    members: 6,
    extra: 2,
  },
  {
    id: 3,
    name: 'Finance',
    description: 'Core finance team responsible for financial operations',
    members: 12,
    extra: 8,
  },
  {
    id: 4,
    name: 'AP Team',
    description: 'Accounts payable processing team',
    members: 8,
    extra: 4,
  },
  {
    id: 5,
    name: 'Shared Services',
    description: 'Cross-functional shared services center',
    members: 15,
    extra: 11,
  },
];

export default function GroupManagement({
  onBack,
}: {
  onBack?: () => void;
}) {
  return (
    <div className="bg-[var(--surface-muted)] h-[calc(100vh-60px)] overflow-auto p-6">
      <div className="mx-auto max-w-[93vw]">

        {/* Header */}
       <div className="flex items-start justify-between gap-4">
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
      <h1 className="text-lg font-semibold text-[var(--gray-13)]">
        Group Management
      </h1>

      <p className="mt-1 text-sm text-[var(--primary-10)]">
        Create and manage logical groups for organizing users and controlling access.
      </p>
    </div>
  </div>

  <button
    className="
      inline-flex shrink-0 items-center gap-2
      rounded-[10px]
      bg-[var(--primary-9)]
      px-5 py-2.5
      text-sm font-medium text-white
      shadow-[var(--shadow-md)]
      transition
      hover:bg-[var(--primary-10)]
    "
  >
    <Plus size={16} />
    Create Group
  </button>
</div>

        {/* Search */}
        <div className="mt-8 max-w-[560px]">
          <div
            className="
              flex items-center gap-3
              rounded-[12px]
              border border-[var(--border-default)]
              bg-white
              px-4 py-3
            "
          >
            <Search
              size={18}
              className="text-[var(--gray-9)]"
            />

            <input
              placeholder="Search groups..."
              className="
                w-full
                bg-transparent
                text-sm
                outline-none
                placeholder:text-[var(--gray-9)]
              "
            />
          </div>
        </div>

        {/* Cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="
                rounded-[16px]
                border border-[var(--border-default)]
                bg-white
                p-6
                shadow-[var(--shadow-sm)]
                transition
                hover:shadow-[var(--shadow-md)]
              "
            >
              {/* Top */}
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div
                    className="
                      flex h-12 w-12 items-center justify-center
                      rounded-[14px]
                      bg-[var(--primary-3)]
                      text-[var(--primary-9)]
                    "
                  >
                    <UsersRound size={24} />
                  </div>

                  <div>
                    <h3 className="text-md font-semibold text-[var(--gray-13)]">
                      {group.name}
                    </h3>

                    <p className="mt-1 max-w-[320px] text-sm text-[var(--gray-10)]">
                      {group.description}
                    </p>
                  </div>
                </div>

                <span
                  className="
                    rounded-[10px]
                    bg-[var(--gray-2)]
                    px-4 py-2
                    text-sm font-semibold
                    text-[var(--gray-13)]
                  "
                >
                  {group.members} members
                </span>
              </div>

              {/* Bottom */}
              <div className="mt-8 flex items-center justify-between">

                <div className="flex items-center gap-2">
                  {group.extra > 0 && (
                    <div
                      className="
                        flex h-8 w-8 items-center justify-center
                        rounded-full
                        bg-[var(--gray-2)]
                        text-xs font-medium
                        text-[var(--gray-10)]
                      "
                    >
                      +{group.extra}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-8">

                  <button
                    className="
                      flex items-center gap-2
                      text-sm font-medium
                      text-[var(--gray-13)]
                      transition
                      hover:text-[var(--primary-10)]
                    "
                  >
                    <UserPlus size={18} />
                    Edit Members
                  </button>

                  <button
                    className="
                      text-[var(--gray-13)]
                      transition
                      hover:text-[var(--primary-10)]
                    "
                  >
                    <Pencil size={18} />
                  </button>

                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}