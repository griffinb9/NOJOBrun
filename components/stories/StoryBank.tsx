'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Story } from '@/lib/types';
import { storage } from '@/lib/storage';
import StoryCard from './StoryCard';
import StoryFormModal from './StoryFormModal';

export default function StoryBank() {
  const [stories, setStories] = useState<Story[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editStory, setEditStory] = useState<Story | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  function load() { setStories(storage.getStories()); }
  useEffect(() => { load(); }, []);

  async function extractFromResume() {
    if (!resumeText.trim()) return;
    setExtracting(true);
    setExtractError('');
    const apiKey = storage.getSettings().anthropicApiKey;
    try {
      const res = await fetch('/api/ai/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) { setExtractError(data.error ?? 'Failed to extract'); return; }
      for (const s of data.stories as Story[]) {
        storage.addStory(s);
      }
      setResumeText('');
      load();
    } catch {
      setExtractError('Network error. Check your API key in Settings.');
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Story Bank</h1>
          <p className="text-stone-400 text-sm mt-0.5">Your STAR stories for interview prep</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700"
        >
          <Plus size={15} />
          Add Story
        </button>
      </div>

      {/* Resume import */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-stone-700 mb-1">Import from Resume</h2>
        <p className="text-xs text-stone-400 mb-3">
          Paste your resume below and AI will extract STAR-ready stories from your experience.
        </p>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={6}
          placeholder="Paste your resume text here..."
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
        />
        {extractError && <p className="text-xs text-red-500 mt-1">{extractError}</p>}
        <button
          onClick={extractFromResume}
          disabled={extracting || !resumeText.trim()}
          className="mt-3 flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          {extracting ? (
            <><Loader2 size={14} className="animate-spin" /> Extracting...</>
          ) : (
            'Extract Stories with AI'
          )}
        </button>
      </div>

      {/* Story list */}
      {stories.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-sm">No stories yet.</p>
          <p className="text-xs mt-1">Import from your resume or add one manually.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onEdit={setEditStory}
              onDelete={() => { storage.deleteStory(story.id); load(); }}
            />
          ))}
        </div>
      )}

      <StoryFormModal open={addOpen} onClose={() => { setAddOpen(false); load(); }} />
      {editStory && (
        <StoryFormModal
          open
          story={editStory}
          onClose={() => { setEditStory(null); load(); }}
        />
      )}
    </div>
  );
}
