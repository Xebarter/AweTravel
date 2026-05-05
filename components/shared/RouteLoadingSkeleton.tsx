import { Skeleton } from '@/components/ui/skeleton';

type RouteLoadingSkeletonProps = {
  /** Wider layout for passenger-style pages */
  variant?: 'default' | 'wide';
};

export function RouteLoadingSkeleton({ variant = 'default' }: RouteLoadingSkeletonProps) {
  const max = variant === 'wide' ? 'max-w-6xl' : 'max-w-4xl';

  return (
    <div className={`mx-auto w-full ${max} space-y-8 px-4 py-8 sm:px-6`} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-2/3 max-w-md rounded-lg" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
