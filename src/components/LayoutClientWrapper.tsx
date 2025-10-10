'use client';

import { ConfirmProvider } from '@/hooks/useConfirm';
import Footer from '@/components/Footer';
import AnalyticsScripts from '@/components/AnalyticsScripts';

export default function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <main className="min-h-screen">{children}</main>
      <Footer />
      <AnalyticsScripts />
    </ConfirmProvider>
  );
}