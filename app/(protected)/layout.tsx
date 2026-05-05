import { ReactNode } from 'react';
import { Header } from '@/components/Header';

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
