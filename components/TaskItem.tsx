'use client';

import type { Task } from '@/lib/types';

const PRIORITY_COLORS: Record<string, string> = {
  High: '#ff6b35',
  Medium: '#c9a84c',
  Low: '#555',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Tap Ins': '#4a9eff',
  Personal: '#9b8afb',
  Golf: '#00ff87',
  Faith: '#c9a84c',
  Finance: '#ff6b35',
  Health: '#00ff87',
  Evergreen: '#4a9eff',
  'Smart Pro': '#9b8afb',
};

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
}

export default function TaskItem({ task, onToggle }: TaskItemProps) {
  const priorityColor = PRIORITY_COLORS[task.priority] ?? '#555';
  const categoryColor = CATEGORY_COLORS[task.category] ?? '#555';

  return (
    <div
      className="flex items-start gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0 group"
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task.id, !task.completed)}
        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-[#333] flex items-center justify-center transition-colors"
        style={{ backgroundColor: task.completed ? '#00ff87' : 'transparent', borderColor: task.completed ? '#00ff87' : '#333' }}
      >
        {task.completed && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5 3.5-4" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug"
          style={{
            fontFamily: 'Geist, sans-serif',
            color: task.completed ? '#444' : '#ddd',
            textDecoration: task.completed ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="uppercase tracking-widest"
            style={{ fontSize: 9, color: categoryColor, fontFamily: 'Geist, sans-serif' }}
          >
            {task.category}
          </span>
        </div>
      </div>

      {/* Priority badge */}
      <span
        className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded"
        style={{
          fontFamily: 'Geist, sans-serif',
          fontSize: 9,
          color: priorityColor,
          backgroundColor: `${priorityColor}15`,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {task.priority}
      </span>
    </div>
  );
}
