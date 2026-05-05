import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-background via-background to-muted/25 text-foreground antialiased">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">{children}</main>
      <SiteFooter />
    </div>
  );
}
