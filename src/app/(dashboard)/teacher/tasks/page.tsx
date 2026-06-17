"use client";

import { useState } from "react";
import { CheckSquare, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
}

export default function TasksView() {
  const { success } = useToast();
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Submit JHS 1 Mathematics scores", dueDate: "2026-06-20", completed: false, priority: "high" },
    { id: "2", title: "Prepare lesson note templates for Week 5", dueDate: "2026-06-22", completed: true, priority: "medium" },
  ]);
  const [typed, setTyped] = useState("");

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!typed.trim()) return;
    const newTask: Task = {
      id: String(Date.now()),
      title: typed,
      dueDate: new Date().toISOString().split("T")[0],
      completed: false,
      priority: "medium"
    };
    setTasks(prev => [newTask, ...prev]);
    setTyped("");
    success("Task added to your checklist!");
  }

  function toggleComplete(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }

  const priorityColors: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-100",
    medium: "bg-amber-50 text-amber-700 border-amber-100",
    low: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Tasks Checklist</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Track your personal academic tasks, submissions list and daily targets.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm max-w-xl space-y-4">
        {/* Add Input */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            required
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Add new task..."
            className="flex-1 px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
          />
          <button
            type="submit"
            className="px-4 h-10 rounded-xl text-white font-bold text-[12px] transition-all shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            Add
          </button>
        </form>

        {/* Task list */}
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => toggleComplete(t.id)}
                  className="rounded border-[#e0daf0] text-[#7c3aed] focus:ring-[#7c3aed]"
                />
                <span className={`text-[12.5px] font-semibold text-slate-800 ${t.completed ? "line-through text-slate-400" : ""}`}>
                  {t.title}
                </span>
              </div>
              <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${priorityColors[t.priority]}`}>
                {t.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
