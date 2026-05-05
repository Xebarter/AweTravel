import { DashboardHeader } from '@/components/shared/DashboardHeader';

export default function TransporterPendingApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardHeader />
      <div className="min-w-0 flex-1">{children}</div>
    </>
  );
}
