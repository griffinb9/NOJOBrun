'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Job, JobStatus } from '@/lib/types';
import KanbanColumn, { type ColumnDragHandleProps } from './KanbanColumn';

type ColumnDef = { id: JobStatus; label: string; color: string };

interface Props {
  column: ColumnDef;
  jobs: Job[];
  onAddJob: () => void;
  onSelectJob: (job: Job) => void;
  /** When false (e.g. narrow view), column reorder is disabled — no handle, no drag. */
  reorderEnabled: boolean;
  emptyWhenFiltered?: string;
}

export default function KanbanSortableColumn({
  column,
  jobs,
  onAddJob,
  onSelectJob,
  reorderEnabled,
  emptyWhenFiltered,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' as const },
    disabled: !reorderEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle: ColumnDragHandleProps | undefined = reorderEnabled
    ? { attributes, listeners, isDragging }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex w-64 shrink-0 flex-col transition-shadow duration-200
        ${isDragging && reorderEnabled ? 'z-30 rounded-[1.35rem] shadow-[0_20px_48px_-12px_rgba(99,102,241,0.22)] ring-2 ring-indigo-300/40' : ''}
      `}
    >
      <KanbanColumn
        column={column}
        jobs={jobs}
        onAddJob={onAddJob}
        onSelectJob={onSelectJob}
        columnDrag={dragHandle}
        emptyWhenFiltered={emptyWhenFiltered}
      />
    </div>
  );
}
