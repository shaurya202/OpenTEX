import React from 'react';
import AppShell from '@/components/app/AppShell';

export default function AppWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
