import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { TransporterSidebar } from '@/components/transporter/TransporterSidebar';

export default function TransporterConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardHeader />
      <div className="flex min-h-0 min-w-0 flex-1">
        <TransporterSidebar />
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
