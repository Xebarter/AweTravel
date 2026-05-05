import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
