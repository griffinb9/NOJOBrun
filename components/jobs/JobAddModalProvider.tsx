'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { JobStatus } from '@/lib/types';
import JobFormModal from '@/components/jobs/JobFormModal';
import { readJobAddDraft } from '@/lib/jobFormDraftSession';

type Ctx = {
  openAddJob: (initialStatus?: JobStatus) => void;
};

const JobAddModalContext = createContext<Ctx | null>(null);

export function useOpenAddJob(): (initialStatus?: JobStatus) => void {
  const c = useContext(JobAddModalContext);
  return c?.openAddJob ?? (() => {});
}

export function JobAddModalProvider({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<JobStatus>('applied');

  useLayoutEffect(() => {
    const d = readJobAddDraft();
    if (d?.modalOpen) {
      setAddOpen(true);
      setInitialStatus(d.initialStatus ?? 'applied');
    }
  }, []);

  const openAddJob = useCallback((status: JobStatus = 'applied') => {
    setInitialStatus(status);
    setAddOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setAddOpen(false);
  }, []);

  const value = useMemo(() => ({ openAddJob }), [openAddJob]);

  return (
    <JobAddModalContext.Provider value={value}>
      {children}
      <JobFormModal
        open={addOpen}
        onClose={handleClose}
        initialStatus={initialStatus}
        persistDraft
      />
    </JobAddModalContext.Provider>
  );
}
