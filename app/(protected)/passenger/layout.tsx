import { DashboardHeader } from '@/components/shared/DashboardHeader';

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
