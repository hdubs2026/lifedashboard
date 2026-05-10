'use client';

import { useState } from 'react';

interface DailyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  checking: string;
  savings: string;
  roth: string;
  prayer: boolean;
  bible: boolean;
  workout: boolean;
  logGolf: boolean;
  golfCourse: string;
  golfScore: string;
  reflection: string;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2"
    >
      <span
        className="text-[#aaa] text-sm"
        style={{ fontFamily: 'Geist, sans-serif' }}
      >
        {label}
      </span>
      <div
        className="relative w-10 h-5 rounded-full transition-colors duration-200"
        style={{ backgroundColor: checked ? '#00ff87' : '#2a2a2a' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 bg-black rounded-full transition-transform duration-200"
          style={{ left: checked ? '22px' : '2px' }}
        />
      </div>
    </button>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[#555] uppercase tracking-widest"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0.00'}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#00ff87] transition-colors"
        style={{ fontFamily: 'DM Mono, monospace' }}
      />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[#555] uppercase tracking-widest"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#00ff87] transition-colors"
        style={{ fontFamily: 'Geist, sans-serif' }}
      />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[#444] uppercase tracking-widest mb-3"
      style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
    >
      {children}
    </h3>
  );
}

export default function DailyModal({ isOpen, onClose }: DailyModalProps) {
  const [form, setForm] = useState<FormState>({
    checking: '',
    savings: '',
    roth: '',
    prayer: false,
    bible: false,
    workout: false,
    logGolf: false,
    golfCourse: '',
    golfScore: '',
    reflection: '',
  });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save daily entry
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checking_balance: form.checking ? parseFloat(form.checking) : null,
          savings_balance: form.savings ? parseFloat(form.savings) : null,
          roth_balance: form.roth ? parseFloat(form.roth) : null,
          prayer_done: form.prayer,
          bible_done: form.bible,
          workout_done: form.workout,
          reflection: form.reflection || null,
        }),
      });

      // 2. Log golf round if requested
      if (form.logGolf && (form.golfCourse || form.golfScore)) {
        await fetch('/api/golf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course: form.golfCourse || null,
            score: form.golfScore ? parseInt(form.golfScore, 10) : null,
          }),
        });
      }

      // 3. Trigger AI task generation (fire-and-forget is fine)
      fetch('/api/tasks/generate', { method: 'POST' }).catch(console.error);

      onClose();
    } catch (err) {
      console.error('Modal submit error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1f1f1f]">
          <h2
            className="text-white text-lg font-semibold"
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            Good morning, Hunter.
          </h2>
          <p
            className="text-[#555] text-xs mt-0.5"
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            Let&apos;s set up today.
          </p>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Finance */}
          <div>
            <SectionHeading>Finance</SectionHeading>
            <div className="space-y-3">
              <NumberInput
                label="Checking Balance"
                value={form.checking}
                onChange={(v) => set('checking', v)}
                placeholder="0.00"
              />
              <NumberInput
                label="Savings Balance"
                value={form.savings}
                onChange={(v) => set('savings', v)}
                placeholder="0.00"
              />
              <NumberInput
                label="ROTH IRA Balance"
                value={form.roth}
                onChange={(v) => set('roth', v)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Habits */}
          <div>
            <SectionHeading>Habits</SectionHeading>
            <div className="divide-y divide-[#1a1a1a]">
              <Toggle label="Prayer" checked={form.prayer} onChange={(v) => set('prayer', v)} />
              <Toggle label="Bible" checked={form.bible} onChange={(v) => set('bible', v)} />
              <Toggle label="Workout" checked={form.workout} onChange={(v) => set('workout', v)} />
            </div>
          </div>

          {/* Golf */}
          <div>
            <SectionHeading>Golf</SectionHeading>
            <Toggle
              label="Log a round?"
              checked={form.logGolf}
              onChange={(v) => set('logGolf', v)}
            />
            {form.logGolf && (
              <div className="mt-3 space-y-3">
                <TextInput
                  label="Course"
                  value={form.golfCourse}
                  onChange={(v) => set('golfCourse', v)}
                  placeholder="Course name"
                />
                <NumberInput
                  label="Score"
                  value={form.golfScore}
                  onChange={(v) => set('golfScore', v)}
                  placeholder="72"
                />
              </div>
            )}
          </div>

          {/* Reflection */}
          <div>
            <SectionHeading>Reflection</SectionHeading>
            <TextInput
              label="One thing from yesterday?"
              value={form.reflection}
              onChange={(v) => set('reflection', v)}
              placeholder="Yesterday I..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ff87] text-black font-semibold py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00e87a] transition-colors"
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            {loading ? 'Saving...' : 'Start My Day'}
          </button>
        </form>
      </div>
    </div>
  );
}
