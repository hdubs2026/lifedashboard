'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/lib/types';

interface TodoListProps {
  notionTasks: Task[];
}

export default function TodoList({ notionTasks }: TodoListProps) {
  const [localChecked, setLocalChecked] = useState<Set<string>>(new Set());
  const [manualTasks, setManualTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Load manual tasks from API
  useEffect(() => {
    fetch('/api/tasks?source=manual')
      .then((r) => r.json())
      .then((data: { tasks: Task[] }) => setManualTasks(data.tasks ?? []))
      .catch(console.error);
  }, []);

  function toggleNotion(id: string) {
    setLocalChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleManual(id: string, completed: boolean) {
    setManualTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed } : t))
    );
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const optimistic: Task = {
      id: tempId,
      date: today,
      title: newTaskTitle.trim(),
      source: 'manual',
      priority: 'Medium',
      category: 'Personal',
      completed: false,
      created_at: new Date().toISOString(),
    };
    setManualTasks((prev) => [...prev, optimistic]);
    setNewTaskTitle('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: optimistic.title }),
      });
      const data = await res.json() as { task: Task };
      setManualTasks((prev) =>
        prev.map((t) => (t.id === tempId ? data.task : t))
      );
    } catch (err) {
      console.error('Failed to add task:', err);
      setManualTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  }

  const allTasks = [
    ...notionTasks.map((t) => ({ ...t, isNotion: true })),
    ...manualTasks.map((t) => ({ ...t, isNotion: false })),
  ];

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5 h-full flex flex-col">
      <p
        className="text-[#444] uppercase tracking-widest mb-4"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        Todo
      </p>

      <div className="flex-1 overflow-y-auto space-y-1 mb-4">
        {allTasks.length === 0 ? (
          <p className="text-[#333] text-sm" style={{ fontFamily: 'Geist, sans-serif' }}>
            No tasks. Add one below.
          </p>
        ) : (
          allTasks.map((task) => {
            const isChecked = task.isNotion
              ? localChecked.has(task.id)
              : task.completed;

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-2 border-b border-[#1a1a1a] last:border-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    task.isNotion
                      ? toggleNotion(task.id)
                      : toggleManual(task.id, !task.completed)
                  }
                  className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isChecked ? '#00ff87' : 'transparent',
                    borderColor: isChecked ? '#00ff87' : '#333',
                  }}
                >
                  {isChecked && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5 3.5-4"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span
                  className="text-sm flex-1"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    color: isChecked ? '#444' : '#ddd',
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>
                {task.isNotion && (
                  <span
                    className="text-[#333]"
                    style={{ fontSize: 9, fontFamily: 'Geist, sans-serif' }}
                  >
                    notion
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add task */}
      <form onSubmit={addTask} className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#00ff87] transition-colors"
          style={{ fontFamily: 'Geist, sans-serif' }}
        />
        <button
          type="submit"
          className="px-3 py-2 bg-[#1f1f1f] text-[#666] rounded text-sm hover:bg-[#2a2a2a] hover:text-white transition-colors"
          style={{ fontFamily: 'Geist, sans-serif' }}
        >
          +
        </button>
      </form>
    </div>
  );
}
