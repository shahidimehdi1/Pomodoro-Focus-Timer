import React, { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskCycle } from '../types';
import { Plus, ChevronLeft, ChevronRight, Play, X, Trash2, Edit2, PlayCircle, Clock } from 'lucide-react';
import LiquidBackground from './LiquidBackground';

interface TasksPageProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onStartTask: (task: Task) => void;
  onNavigateHome: () => void;
}

export default function TasksPage({ tasks, setTasks, onStartTask, onNavigateHome }: TasksPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [totalMinutes, setTotalMinutes] = useState('60');
  const [splitPattern, setSplitPattern] = useState<'15/3/5' | '10/2/5'>('15/3/5');
  const [generatedCycles, setGeneratedCycles] = useState<TaskCycle[]>([]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayTasks = tasks.filter(t => t.date === dateStr);

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));

  const openNewTaskModal = () => {
    setTitle('');
    setTotalMinutes('60');
    setSplitPattern('15/3/5');
    setGeneratedCycles([]);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setTitle(task.title);
    setTotalMinutes(task.totalMinutes.toString());
    setGeneratedCycles(task.cycles.map(c => ({...c})));
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const generateCycles = () => {
    const total = parseInt(totalMinutes);
    if (!total || isNaN(total) || total <= 0) return;

    let focusLen = 15;
    let shortBreak = 3; // user said 3 part 15 min, after that 5 min
    let groupSize = 3;
    let longBreak = 5;

    if (splitPattern === '10/2/5') {
      focusLen = 10;
      shortBreak = 2; // assuming short break is 2
      groupSize = 2; // user said 2 cycle of 10 min and 5 min break
      longBreak = 5;
    }

    const cycles: TaskCycle[] = [];
    let remaining = total;
    let count = 0;
    
    while (remaining > 0) {
      const focus = Math.min(remaining, focusLen);
      remaining -= focus;
      count++;
      
      let brk = 0;
      if (remaining > 0) {
        if (count % groupSize === 0) {
          brk = longBreak;
        } else {
          brk = shortBreak;
        }
      }
      
      cycles.push({
        id: uuidv4(),
        name: `Part ${count}`,
        focusMinutes: focus,
        breakMinutes: brk,
        completed: false
      });
    }
    
    setGeneratedCycles(cycles);
  };

  const saveTask = () => {
    if (!title.trim() || generatedCycles.length === 0) return;

    if (editingTask) {
      setTasks(prev => prev.map(t => 
        t.id === editingTask.id ? { ...t, title, totalMinutes: parseInt(totalMinutes), cycles: generatedCycles } : t
      ));
    } else {
      const newTask: Task = {
        id: uuidv4(),
        title,
        date: dateStr,
        totalMinutes: parseInt(totalMinutes),
        cycles: generatedCycles,
      };
      setTasks(prev => [...prev, newTask]);
    }
    setIsModalOpen(false);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateCycleName = (id: string, newName: string) => {
    setGeneratedCycles(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  return (
    <div className="w-full h-full flex flex-col font-sans relative overflow-y-auto no-scrollbar pb-32">
      <div className="max-w-2xl mx-auto w-full z-10 relative pt-12 md:pt-20">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <button onClick={onNavigateHome} className="glass-button px-4 py-2 hover:text-white transition-colors uppercase tracking-[0.2em] text-[12px] font-semibold flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Home
          </button>
          <h1 className="text-xl uppercase tracking-[0.3em] text-white/90 font-medium drop-shadow-sm">Daily Tasks</h1>
          <div className="w-24"></div> {/* Spacer for alignment */}
        </header>

        {/* Date Navigator */}
        <div className="flex items-center justify-center gap-6 mb-12">
          <button onClick={handlePrevDay} className="p-3 glass-button transition-colors focus:outline-none">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl font-[200] tracking-wide text-center min-w-[200px] drop-shadow-md">
            {format(currentDate, 'MMM do, yyyy')}
          </div>
          <button onClick={handleNextDay} className="p-3 glass-button transition-colors focus:outline-none">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Task List */}
        <div className="space-y-6">
          {dayTasks.length === 0 ? (
            <div className="text-center py-20 glass-panel">
              <p className="text-white/60 uppercase tracking-[0.2em] text-sm font-medium drop-shadow-sm">No tasks for this day</p>
            </div>
          ) : (
            dayTasks.map(task => {
              const completedCount = task.cycles.filter(c => c.completed).length;
              const isAllCompleted = completedCount === task.cycles.length;

              return (
                <div key={task.id} className="p-6 md:p-8 glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:bg-white/20 transition-all duration-300">
                  <div className="flex-1">
                    <h3 className={`text-xl font-medium tracking-wide mb-2 drop-shadow-sm ${isAllCompleted ? 'text-white/40 line-through' : 'text-white'}`}>{task.title}</h3>
                    <div className="flex items-center gap-4 text-xs uppercase tracking-[0.1em] text-white/70">
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {task.totalMinutes} min</span>
                      <span>•</span>
                      <span>{completedCount} / {task.cycles.length} Cycles</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEditTaskModal(task)} className="p-3 glass-button opacity-0 group-hover:opacity-100 sm:focus:opacity-100 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-3 glass-button hover:bg-red-500/50 hover:border-red-500/50 opacity-0 group-hover:opacity-100 sm:focus:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onStartTask(task)} 
                      disabled={isAllCompleted}
                      className={`p-3 glass-button flex items-center justify-center shrink-0 transition-all ${isAllCompleted ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/40 shadow-xl'}`}
                    >
                      <Play className="w-5 h-5 ml-1" fill="currentColor" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Task Button */}
        <button 
          onClick={openNewTaskModal}
          className="mt-8 w-full py-6 glass-panel text-white/70 hover:text-white hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-sm font-semibold shadow-lg cursor-pointer border-dashed border-2"
        >
          <Plus className="w-5 h-5" /> Add Task
        </button>

      </div>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex justify-center p-4 sm:p-6 overflow-y-auto w-full">
          <div className="max-w-2xl w-full glass-panel p-6 sm:p-10 my-auto h-fit space-y-8 flex flex-col relative z-10 shadow-2xl">
            
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-[400] tracking-wide uppercase drop-shadow-md">{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 glass-button focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Task Name */}
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-white/80 mb-2 font-medium drop-shadow-sm">Task Name</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Video Editing"
                  className="w-full bg-white/5 border border-white/20 p-3 rounded-2xl text-lg focus:outline-none focus:border-white/60 focus:bg-white/10 transition-colors placeholder:text-white/30 backdrop-blur-md shadow-inner"
                />
              </div>

              {/* Total Time & Pattern */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-xs uppercase tracking-[0.1em] text-white/80 mb-2 font-medium drop-shadow-sm">Total Time (minutes)</label>
                  <input 
                    type="number" 
                    value={totalMinutes} 
                    onChange={e => setTotalMinutes(e.target.value)} 
                    className="w-full bg-white/5 border border-white/20 p-3 rounded-2xl text-lg focus:outline-none focus:border-white/60 focus:bg-white/10 transition-colors backdrop-blur-md shadow-inner"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs uppercase tracking-[0.1em] text-white/80 mb-2 font-medium drop-shadow-sm">Split Pattern</label>
                  <select 
                    value={splitPattern} 
                    onChange={e => setSplitPattern(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/20 p-3 rounded-2xl text-lg focus:outline-none focus:border-white/60 transition-colors appearance-none backdrop-blur-md shadow-inner text-white"
                  >
                    <option value="15/3/5" className="bg-zinc-900 text-white">15m Focus &rarr; 3 cycles &rarr; 5m break</option>
                    <option value="10/2/5" className="bg-zinc-900 text-white">10m Focus &rarr; 2 cycles &rarr; 5m break</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button 
                onClick={generateCycles}
                className="w-full py-4 text-center glass-button font-medium uppercase tracking-[0.1em] text-sm"
              >
                Generate Cycles
              </button>

              {/* Cycles List */}
              {generatedCycles.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-white/20">
                  <h3 className="text-xs uppercase tracking-[0.1em] text-white/80 font-medium drop-shadow-sm">Task Cycles</h3>
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                    {generatedCycles.map((cycle, i) => (
                      <div key={cycle.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 shadow-sm">
                        <div className="flex items-center gap-3 text-white/60 font-mono text-sm">
                          <span>{i + 1}</span>
                        </div>
                        <input 
                          type="text" 
                          value={cycle.name}
                          onChange={e => updateCycleName(cycle.id, e.target.value)}
                          className="flex-1 bg-transparent border-b border-white/20 focus:border-white/80 p-1 focus:outline-none transition-colors"
                        />
                        <div className="flex items-center gap-3 text-xs font-mono text-white/80 bg-black/40 px-3 py-1.5 rounded-xl shrink-0 shadow-inner">
                          {cycle.focusMinutes}m focus
                          {cycle.breakMinutes > 0 && ` + ${cycle.breakMinutes}m break`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Save */}
            <button 
              onClick={saveTask}
              disabled={!title.trim() || generatedCycles.length === 0}
              className="w-full py-4 text-center glass-button !bg-white/20 hover:!bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed font-semibold uppercase tracking-[0.1em] text-sm mt-4 text-white shadow-xl"
            >
              Save Task
            </button>

          </div>
        </div>
      )}

      {/* Global styles for custom scrollbar embedded here for simplicity */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}
