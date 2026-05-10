'use client';

import { useState } from 'react';
import DailyModal from './DailyModal';

interface DashboardClientProps {
  hasEntryToday: boolean;
}

export default function DashboardClient({ hasEntryToday }: DashboardClientProps) {
  const [modalOpen, setModalOpen] = useState(!hasEntryToday);

  return (
    <DailyModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
    />
  );
}
