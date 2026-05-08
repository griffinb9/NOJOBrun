'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Story } from '@/lib/types';
import { db } from '@/lib/db';
import { newId, now } from '@/lib/utils';

const ALL_TAGS = ['Leadership', 'Teamwork', 'Problem Solving', 'Technical', 'Communication'];

interface Props {
  open: boolean;
  onClose: () => void;
  story?: Story;
}

const empty = { title: '', situation: '', task: '', action: '', result: '', tags: [] as string[] };

export default function StoryFormModal({ open, onClose, story }: Props) {
  const [form, setForm] = useState({ ...empty });

  useEffect(() => {
    if (open) {
      setForm(story ? { title: story.title, situation: story.situation, task: story.task, action: story.action, result: story.result, tags: story.tags } : { ...empty });
    }
  }, [open, story]);

  function set(key: string, val: string) { setForm((f) => ({ ...f, [key]: val })); }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  async function save() {
    if (!form.title.trim()) return;
    const ts = now();
    if (story) {
      await db.updateStory({ ...story, ...form, updatedAt: ts });
    } else {
      await db.addStory({ ...form, id: newId(), createdAt: ts, updatedAt: ts });
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-stone-800">{story ? 'Edit Story' : 'Add Story'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <Field label="Title *">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Led redesign of student portal" />
          </Field>

          <Field label="Situation">
            <textarea value={form.situation} onChange={(e) => set('situation', e.target.value)} rows={2} placeholder="What was the context?" />
          </Field>

          <Field label="Task">
            <textarea value={form.task} onChange={(e) => set('task', e.target.value)} rows={2} placeholder="What were you responsible for?" />
          </Field>

          <Field label="Action">
            <textarea value={form.action} onChange={(e) => set('action', e.target.value)} rows={3} placeholder="What did you do specifically?" />
          </Field>

          <Field label="Result">
            <textarea value={form.result} onChange={(e) => set('result', e.target.value)} rows={2} placeholder="What was the outcome?" />
          </Field>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.tags.includes(tag)
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-stone-200 text-stone-500 hover:border-violet-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 rounded-lg">Cancel</button>
          <button
            onClick={save}
            disabled={!form.title.trim()}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium disabled:opacity-40"
          >
            {story ? 'Save Changes' : 'Add Story'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      <div className="[&_input]:w-full [&_input]:border [&_input]:border-stone-200 [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-violet-300 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-stone-200 [&_textarea]:rounded-lg [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:focus:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-violet-300 [&_textarea]:resize-none">
        {children}
      </div>
    </div>
  );
}
