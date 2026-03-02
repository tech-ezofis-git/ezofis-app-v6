const FormBuilderSkeleton = () => {
    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-white select-none">
            {/* Header Skeleton */}
            <header className="flex h-16 items-center justify-between border-b border-gray-3 px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-gray-2 animate-pulse" />
                    <div className="flex flex-col gap-1.5">
                        <div className="h-4 w-32 rounded bg-gray-3 animate-pulse" />
                        <div className="h-3 w-48 rounded bg-gray-2 animate-pulse" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-16 rounded-lg bg-gray-2 animate-pulse" />
                    <div className="h-8 w-16 rounded-lg bg-gray-2 animate-pulse" />
                    <div className="h-8 w-24 rounded-lg bg-gray-3 animate-pulse" />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Canvas Skeleton */}
                <div className="flex-1 overflow-auto bg-gray-50/50 px-4 py-8">
                    <div className="max-w-[800px] mx-auto space-y-8">
                        {/* Mock Title/Welcome Page */}
                        <div className="h-28 w-full rounded-2xl bg-white border border-gray-2 shadow-sm p-6 space-y-3">
                            <div className="h-3 w-20 rounded bg-gray-2 animate-pulse" />
                            <div className="h-6 w-3/4 rounded bg-gray-3 animate-pulse" />
                            <div className="h-4 w-1/2 rounded bg-gray-2 animate-pulse" />
                        </div>

                        {/* Mock Question Cards */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 w-full rounded-2xl bg-white border border-gray-2 shadow-sm p-6 flex gap-4">
                                <div className="h-10 w-10 rounded-xl bg-gray-2 animate-pulse shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-16 rounded bg-gray-2 animate-pulse" />
                                        <div className="h-3 w-12 rounded bg-gray-2 animate-pulse" />
                                    </div>
                                    <div className="h-5 w-2/3 rounded bg-gray-3 animate-pulse" />
                                    <div className="h-4 w-1/2 rounded bg-gray-2 animate-pulse" />
                                </div>
                            </div>
                        ))}

                        {/* Add Button Skeleton */}
                        <div className="flex justify-center">
                            <div className="h-10 w-40 rounded-xl bg-gray-100/50 border-2 border-dashed border-gray-3 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Sidebar Skeleton */}
                <div className="w-[380px] h-full border-l border-gray-3 bg-white p-6 space-y-6 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="h-6 w-32 rounded bg-gray-3 animate-pulse" />
                        <div className="h-6 w-6 rounded bg-gray-2 animate-pulse" />
                    </div>
                    <div className="h-px w-full bg-gray-2" />
                    <div className="space-y-4">
                        <div className="h-10 w-full rounded-lg bg-gray-1 animate-pulse" />
                        <div className="h-10 w-full rounded-lg bg-gray-1 animate-pulse" />
                        <div className="h-24 w-full rounded-lg bg-gray-1 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormBuilderSkeleton;
