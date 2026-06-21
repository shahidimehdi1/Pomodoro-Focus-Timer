import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Routine, RoutineTask } from '../types';
import { Plus, ChevronLeft, Play, X, Trash2, Edit2, Clock } from 'lucide-react';
import LiquidBackground from './LiquidBackground';

interface RoutinesPageProps {
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  onStartRoutine: (routine: Routine) => void;
  onNavigateHome: () => void;
}

export default function RoutinesPage({ routines, setRoutines, onStartRoutine, onNavigateHome }: RoutinesPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState<RoutineTask[]>([]);

  const openNewRoutineModal = () => {
    setName('');
    setTasks([]);
    setEditingRoutine(null);
    setIsModalOpen(true);
  };

  const openEditRoutineModal = (routine: Routine) => {
    setName(routine.name);
    setTasks(routine.tasks.map(t => ({ ...t })));
    setEditingRoutine(routine);
    setIsModalOpen(true);
  };

  const addTaskRow = () => {
    setTasks(prev => [...prev, {
      id: uuidv4(),
      name: `Task ${prev.length + 1}`,
      focusMinutes: 25,
      breakMinutes: 5,
      completed: false
    }]);
  };

  const updateTask = (id: string, field: keyof RoutineTask, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTaskRow = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const saveRoutine = () => {
    if (!name.trim() || tasks.length === 0) return;

    if (editingRoutine) {
      setRoutines(prev => prev.map(r => 
        r.id === editingRoutine.id ? { ...r, name, tasks } : r
      ));
    } else {
      const newRoutine: Routine = {
        id: uuidv4(),
        name,
        tasks,
      };
      setRoutines(prev => [...prev, newRoutine]);
    }
    setIsModalOpen(false);
  };

  const deleteRoutine = (id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
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
          <h1 className="text-xl uppercase tracking-[0.3em] text-white/90 font-medium drop-shadow-sm">Daily Routines</h1>
          <div className="w-24"></div> {/* Spacer */}
        </header>

        {/* Routines List */}
        <div className="space-y-6">
          {routines.length === 0 ? (
            <div className="text-center py-20 glass-panel">
              <p className="text-white/60 uppercase tracking-[0.2em] text-sm font-medium drop-shadow-sm">No routines created yet.</p>
            </div>
          ) : (
            routines.map(routine => {
              const totalMinutes = routine.tasks.reduce((sum, t) => sum + t.focusMinutes + t.breakMinutes, 0);
              
              return (
                <div key={routine.id} className="p-6 md:p-8 glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:bg-white/20 transition-all duration-300">
                  <div className="flex-1">
                    <h3 className="text-xl font-medium tracking-wide mb-2 text-white drop-shadow-sm">{routine.name}</h3>
                    <div className="flex items-center gap-4 text-xs uppercase tracking-[0.1em] text-white/70">
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {totalMinutes} min total</span>
                      <span>•</span>
                      <span>{routine.tasks.length} tasks</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEditRoutineModal(routine)} className="p-3 glass-button opacity-0 group-hover:opacity-100 sm:focus:opacity-100 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteRoutine(routine.id)} className="p-3 glass-button hover:bg-red-500/50 hover:border-red-500/50 opacity-0 group-hover:opacity-100 sm:focus:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onStartRoutine(routine)} 
                      className="p-3 glass-button flex items-center justify-center shrink-0 shadow-xl hover:bg-white/40 transition-all"
                    >
                      <Play className="w-5 h-5 ml-1" fill="currentColor" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Routine Button */}
        <button 
          onClick={openNewRoutineModal}
          className="mt-8 w-full py-6 glass-panel text-white/70 hover:text-white hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-sm font-semibold shadow-lg cursor-pointer border-dashed border-2"
        >
          <Plus className="w-5 h-5" /> Add Routine
        </button>

      </div>

      {/* Routine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex justify-center p-4 sm:p-6 overflow-y-auto w-full">
          <div className="max-w-2xl w-full glass-panel p-6 sm:p-10 my-auto h-fit space-y-8 flex flex-col relative z-50 shadow-2xl">
            
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-[400] tracking-wide uppercase drop-shadow-md">{editingRoutine ? 'Edit Routine' : 'New Routine'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 glass-button focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Routine Name */}
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-white/80 mb-2 font-medium drop-shadow-sm">Routine Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Morning Routine"
                  className="w-full bg-white/5 border border-white/20 p-3 rounded-2xl text-lg focus:outline-none focus:border-white/60 focus:bg-white/10 transition-colors placeholder:text-white/30 backdrop-blur-md shadow-inner"
                />
              </div>

              {/* Tasks List */}
              <div className="space-y-4 pt-6 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-[0.1em] text-white/80 font-medium drop-shadow-sm">Routine Tasks</h3>
                  <button onClick={addTaskRow} className="text-[10px] uppercase tracking-[0.1em] text-white/90 hover:text-white flex items-center gap-1 glass-button px-3 py-2">
                    <Plus className="w-3 h-3" /> Add Task
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {tasks.length === 0 ? (
                     <div className="text-sm text-white/50 italic p-6 text-center border border-dashed border-white/20 rounded-2xl bg-white/5">No tasks added to this routine yet.</div>
                  ) : tasks.map((task, i) => (
                    <div key={task.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 shadow-sm relative group">
                      <div className="flex items-center gap-3 text-white/60 font-mono text-sm">
                        <span>{i + 1}</span>
                      </div>
                      
                      <div className="flex-1 space-y-4 sm:space-y-0 sm:flex sm:gap-4 sm:items-center">
                        <input 
                          type="text" 
                          value={task.name}
                          onChange={e => updateTask(task.id, 'name', e.target.value)}
                          placeholder="Task name"
                          className="w-full sm:flex-1 bg-transparent border-b border-white/20 focus:border-white/80 p-1 focus:outline-none transition-colors"
                        />
                        <div className="flex gap-4">
                          <div className="w-20">
                            <label className="text-[10px] uppercase text-white/60 block mb-1">Focus (m)</label>
                            <input 
                              type="number"
                              value={task.focusMinutes}
                              onChange={e => updateTask(task.id, 'focusMinutes', parseInt(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/20 rounded-lg focus:border-white/80 p-1.5 focus:outline-none text-center shadow-inner"
                            />
                          </div>
                          <div className="w-20">
                            <label className="text-[10px] uppercase text-white/60 block mb-1">Break (m)</label>
                            <input 
                              type="number"
                              value={task.breakMinutes}
                              onChange={e => updateTask(task.id, 'breakMinutes', parseInt(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/20 rounded-lg focus:border-white/80 p-1.5 focus:outline-none text-center shadow-inner"
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => removeTaskRow(task.id)} 
                        className="absolute right-2 top-2 sm:relative sm:top-0 p-2 glass-button hover:bg-red-500/50 hover:border-red-500/50 transition-colors w-8 h-8 flex items-center justify-center !rounded-full opacity-60 hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Save */}
            <button 
              onClick={saveRoutine}
              disabled={!name.trim() || tasks.length === 0}
              className="w-full py-4 text-center glass-button !bg-white/20 hover:!bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed font-semibold uppercase tracking-[0.1em] text-sm mt-4 text-white shadow-xl"
            >
              Save Routine
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
