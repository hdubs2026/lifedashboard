'use client';

import { useState, useEffect } from 'react';
import TaskItem from './TaskItem';
import type { Task, TaskCategory } from '@/lib/types';

interface TaskListProps {
  initialTasks: Task[];
}

const CATEGORY_ORDER: TaskCategory[] = [
  'Evergreen', 'Smart Pro', 'Finance', 'Health', 'Faith', 'Golf', 'Tap Ins', 'Personal',
];

export default function TaskList({ initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  async function handleToggle(id: string, completed: boolean) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed } : t))
    );

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
    } catch (err) {
      console.error('Failed to toggle task:', err);
      // Revert
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    }
  }

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, Task[]>>((acc, cat) => {
    const categoryTasks = tasks.filter(
      (t) => t.category.toLowerCase() === cat.toLowerCase()
    );
    if (categoryTasks.length > 0) acc[cat] = categoryTasks;
    return acc;
  }, {});

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[#444] uppercase tracking-widest"
          style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
        >
          AI Tasks
        </p>
        <span
          className="text-[#555]"
          style={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}
        >
          {completedCount}/{tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-[#333] text-sm" style={{ fontFamily: 'Geist, sans-serif' }}>
          No tasks yet. Complete the morning check-in to generate tasks.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryTasks]) => (
            <div key={category}>
              <p
                className="text-[#333] uppercase tracking-widest mb-1"
                style={{ fontSize: 9, fontFamily: 'Geist, sans-serif' }}
              >
                {category}
              </p>
              {categoryTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
