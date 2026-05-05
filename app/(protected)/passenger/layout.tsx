import { SiteFooter } from '@/components/site/SiteFooter';
import { PassengerSidebar } from '@/components/passenger/PassengerSidebar';

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex min-h-0 min-w-0 flex-1">
        <PassengerSidebar />
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
      <SiteFooter />
    </div>
  );
}
