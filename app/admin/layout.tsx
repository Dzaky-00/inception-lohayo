'use client';
import AppShell from '@/components/AppShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedRole="admin">
      <div className="p-8">{children}</div>
    </AppShell>
  );
}