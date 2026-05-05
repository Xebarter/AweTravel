import { SiteFooter } from '@/components/site/SiteFooter';

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
