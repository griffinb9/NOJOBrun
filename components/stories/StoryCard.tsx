'use client';

import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Story } from '@/lib/types';

const TAGS_COLORS: Record<string, string> = {
  Leadership: 'bg-blue-50 text-blue-600',
  Teamwork: 'bg-green-50 text-green-600',
  'Problem Solving': 'bg-amber-50 text-amber-600',
  Technical: 'bg-violet-50 text-violet-600',
  Communication: 'bg-pink-50 text-pink-600',
};

interface Props {
  story: Story;
  onEdit: (s: Story) => void;
  onDelete: () => void;
}

export default function StoryCard({ story, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-800 text-sm">{story.title}</h3>
          {story.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {story.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded-full ${TAGS_COLORS[tag] ?? 'bg-stone-100 text-stone-500'}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-3 shrink-0">
          <button onClick={() => onEdit(story)} className="p-1.5 text-stone-400 hover:text-violet-600 rounded-lg">
            <Pencil size={14} />
          </button>
          <button onClick={() => { if (confirm('Delete this story?')) onDelete(); }} className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpanded((e) => !e)} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 px-4 pb-4 space-y-3 pt-3">
          {[
            { label: 'Situation', value: story.situation },
            { label: 'Task', value: story.task },
            { label: 'Action', value: story.action },
            { label: 'Result', value: story.result },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{label}</span>
              <p className="text-sm text-stone-700 mt-0.5 whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
