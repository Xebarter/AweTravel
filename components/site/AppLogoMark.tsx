import { cn } from '@/lib/utils';

type AppLogoMarkProps = {
  className?: string;
  /** Square size in CSS pixels (width & height). */
  size?: number;
};

/** Inline logo image from `/logo.svg` (public). Use next to wordmark for accessibility. */
export function AppLogoMark({ className, size = 40 }: AppLogoMarkProps) {
  return (
    <img
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      decoding="async"
      aria-hidden
    />
  );
}
