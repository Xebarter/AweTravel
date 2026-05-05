import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] flex-1 gap-6 p-4 sm:p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="hidden w-56 shrink-0 rounded-xl lg:block" />
      <div className="min-w-0 flex-1 space-y-6">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
