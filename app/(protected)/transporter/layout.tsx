import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { TransporterSidebar } from '@/components/transporter/TransporterSidebar';

export default function TransporterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      <div className="flex min-w-0 flex-1">
        <TransporterSidebar />
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
