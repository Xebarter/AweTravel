import { TransporterSidebar } from '@/components/transporter/TransporterSidebar';

export default function TransporterConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <TransporterSidebar />
      <main className="min-h-0 min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
