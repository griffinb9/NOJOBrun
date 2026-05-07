'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { storage } from '@/lib/storage';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (open) {
      const settings = storage.getSettings();
      setApiKey(settings.anthropicApiKey ?? '');
    }
  }, [open]);

  function save() {
    storage.saveSettings({ anthropicApiKey: apiKey.trim() || undefined });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-stone-800">Settings</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <p className="text-xs text-stone-400 mt-1">
              Stored locally in your browser. Used for AI features (email drafts, interview prep).
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
