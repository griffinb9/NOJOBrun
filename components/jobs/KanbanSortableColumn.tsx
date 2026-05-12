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
}

export default function KanbanSortableColumn({
  column,
  jobs,
  onAddJob,
  onSelectJob,
  reorderEnabled,
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
        flex w-64 shrink-0 flex-col
        ${isDragging && reorderEnabled ? 'z-30 rounded-3xl shadow-xl shadow-indigo-500/15 ring-2 ring-indigo-400/40' : ''}
      `}
    >
      <KanbanColumn
        column={column}
        jobs={jobs}
        onAddJob={onAddJob}
        onSelectJob={onSelectJob}
        columnDrag={dragHandle}
      />
    </div>
  );
}
