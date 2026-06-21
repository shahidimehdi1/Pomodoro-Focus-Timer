/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Minimize, Settings, X, Timer, ListTodo, Calendar, Moon, Sun, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Task, Routine } from './types';
import TasksPage from './components/TasksPage';
import LiquidBackground from './components/LiquidBackground';
import RoutinesPage from './components/RoutinesPage';

type Mode = 'idle' | 'focus' | 'break';
type CycleConfig = '10/2' | '15/3';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('focus-theme');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [currentTab, setCurrentTab] = useState<'timer' | 'tasks' | 'routines'>('timer');
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('focus-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('focus-theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  
  useEffect(() => {
    localStorage.setItem('focus-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const [routines, setRoutines] = useState<Routine[]>(() => {
    const saved = localStorage.getItem('focus-routines');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('focus-routines', JSON.stringify(routines));
  }, [routines]);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [activeCycleIndex, setActiveCycleIndex] = useState(0);

  const [mode, setMode] = useState<Mode>('idle');
  const [cycleConfig, setCycleConfig] = useState<CycleConfig>('10/2');
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [brownNoiseOn, setBrownNoiseOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pipActive, setPipActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const targetTimeRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const focusTime = activeTask 
    ? activeTask.cycles[activeCycleIndex]?.focusMinutes * 60 
    : activeRoutine
      ? activeRoutine.tasks[activeCycleIndex]?.focusMinutes * 60
      : (cycleConfig === '10/2' ? 10 * 60 : 15 * 60);

  const breakTime = activeTask 
    ? activeTask.cycles[activeCycleIndex]?.breakMinutes * 60 
    : activeRoutine
      ? activeRoutine.tasks[activeCycleIndex]?.breakMinutes * 60
      : (cycleConfig === '10/2' ? 2 * 60 : 3 * 60);

  // Initialize or resume AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // System Beep
  const playBeep = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }, [getAudioContext]);

  // Brown Noise Generator
  useEffect(() => {
    let source: AudioBufferSourceNode | null = null;
    let gainNode: GainNode | null = null;
    let ctx: AudioContext | null = null;
    
    if (brownNoiseOn) {
      try {
        ctx = getAudioContext();
        const bufferSize = ctx.sampleRate * 5; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; 
        }

        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        gainNode = ctx.createGain();
        gainNode.gain.value = 0.5; 
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start();
      } catch (e) {
        console.error("Brown noise generation failed", e);
      }
    }

    return () => {
      if (source && gainNode && ctx) {
        try {
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
          const stopSource = source;
          setTimeout(() => {
            stopSource.stop();
            stopSource.disconnect();
          }, 150);
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [brownNoiseOn, getAudioContext]);

  useEffect(() => {
    if (mode === 'idle') {
      setTimeLeft(focusTime);
    }
  }, [cycleConfig, mode, focusTime]);

  const startTimer = useCallback(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    let currentDuration = timeLeft;
    if (mode === 'idle') {
      setMode('focus');
      setCycleCount(1);
      currentDuration = focusTime;
    }
    
    targetTimeRef.current = Date.now() + currentDuration * 1000;
    setIsRunning(true);
  }, [mode, focusTime, timeLeft]);

  const handleStartTask = (task: Task) => {
    setActiveTask(task);
    setActiveRoutine(null);
    setActiveCycleIndex(0);
    setCurrentTab('timer');
    setMode('focus');
    const fTime = task.cycles[0].focusMinutes * 60;
    setTimeLeft(fTime);
    setCycleCount(1);
    targetTimeRef.current = Date.now() + (fTime * 1000);
    setIsRunning(true);
  };

  const handleStartRoutine = (routine: Routine) => {
    setActiveRoutine(routine);
    setActiveTask(null);
    setActiveCycleIndex(0);
    setCurrentTab('timer');
    setMode('focus');
    const fTime = routine.tasks[0].focusMinutes * 60;
    setTimeLeft(fTime);
    setCycleCount(1);
    targetTimeRef.current = Date.now() + (fTime * 1000);
    setIsRunning(true);
  };

  const pauseTimer = useCallback(() => {
    if (hardMode && mode === 'focus') return;
    setIsRunning(false);
    targetTimeRef.current = null;
  }, [hardMode, mode]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    targetTimeRef.current = null;
    setActiveTask(null);
    setActiveRoutine(null);
    setMode('idle');
    setTimeLeft(focusTime);
    setCycleCount(0);
  }, [focusTime]);

  // Handle visibility change for immediate UI update when unlocking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && targetTimeRef.current) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning]);

  // Main Timer Interval
  useEffect(() => {
    let interval: number;
    if (isRunning && targetTimeRef.current) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetTimeRef.current! - now) / 1000));
        
        setTimeLeft(remaining);

        if (remaining === 0) {
          playBeep();
          if (mode === 'focus') {
            if (activeTask) {
              setTasks(prev => prev.map(t => 
                t.id === activeTask.id 
                  ? { ...t, cycles: t.cycles.map((c, i) => i === activeCycleIndex ? { ...c, completed: true } : c) }
                  : t
              ));
              if (activeTask.cycles[activeCycleIndex].breakMinutes === 0) {
                 if (activeCycleIndex + 1 < activeTask.cycles.length) {
                    if (Notification.permission === 'granted') new Notification('Focus phase finished!', { body: 'Starting next part...' });
                    const nextIndex = activeCycleIndex + 1;
                    setActiveCycleIndex(nextIndex);
                    const nextFocus = activeTask.cycles[nextIndex].focusMinutes * 60;
                    targetTimeRef.current = Date.now() + nextFocus * 1000;
                    setTimeLeft(nextFocus);
                 } else {
                    if (Notification.permission === 'granted') new Notification('Task Complete!', { body: 'Great job!' });
                    setActiveTask(null);
                    setMode('idle');
                    setIsRunning(false);
                    targetTimeRef.current = null;
                 }
                 return;
              }
            } else if (activeRoutine) {
              setRoutines(prev => prev.map(r => 
                r.id === activeRoutine.id 
                  ? { ...r, tasks: r.tasks.map((t, i) => i === activeCycleIndex ? { ...t, completed: true } : t) }
                  : r
              ));
              if (activeRoutine.tasks[activeCycleIndex].breakMinutes === 0) {
                 if (activeCycleIndex + 1 < activeRoutine.tasks.length) {
                    if (Notification.permission === 'granted') new Notification('Focus phase finished!', { body: 'Starting next part...' });
                    const nextIndex = activeCycleIndex + 1;
                    setActiveCycleIndex(nextIndex);
                    const nextFocus = activeRoutine.tasks[nextIndex].focusMinutes * 60;
                    targetTimeRef.current = Date.now() + nextFocus * 1000;
                    setTimeLeft(nextFocus);
                 } else {
                    if (Notification.permission === 'granted') new Notification('Routine Complete!', { body: 'Great job!' });
                    setActiveRoutine(null);
                    setMode('idle');
                    setIsRunning(false);
                    targetTimeRef.current = null;
                 }
                 return;
              }
            }
            
            if (Notification.permission === 'granted') {
              new Notification('Focus Complete!', { body: 'Time for a break.' });
            }
            setMode('break');
            targetTimeRef.current = Date.now() + breakTime * 1000;
            setTimeLeft(breakTime);
          } else {
            if (Notification.permission === 'granted') {
              new Notification('Break Over!', { body: 'Time to focus.' });
            }
            
            if (activeTask) {
              if (activeCycleIndex + 1 < activeTask.cycles.length) {
                const nextIndex = activeCycleIndex + 1;
                setActiveCycleIndex(nextIndex);
                setMode('focus');
                const nextFocus = activeTask.cycles[nextIndex].focusMinutes * 60;
                targetTimeRef.current = Date.now() + nextFocus * 1000;
                setTimeLeft(nextFocus);
              } else {
                new Notification('Task Complete!', { body: 'Great job!' });
                setActiveTask(null);
                setMode('idle');
                setIsRunning(false);
                targetTimeRef.current = null;
              }
            } else if (activeRoutine) {
              if (activeCycleIndex + 1 < activeRoutine.tasks.length) {
                const nextIndex = activeCycleIndex + 1;
                setActiveCycleIndex(nextIndex);
                setMode('focus');
                const nextFocus = activeRoutine.tasks[nextIndex].focusMinutes * 60;
                targetTimeRef.current = Date.now() + nextFocus * 1000;
                setTimeLeft(nextFocus);
              } else {
                new Notification('Routine Complete!', { body: 'Great job!' });
                setActiveRoutine(null);
                setMode('idle');
                setIsRunning(false);
                targetTimeRef.current = null;
              }
            } else {
              setMode('focus');
              targetTimeRef.current = Date.now() + focusTime * 1000;
              setTimeLeft(focusTime);
              setCycleCount(c => c + 1);
            }
          }
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, focusTime, breakTime, playBeep, activeTask, activeRoutine, activeCycleIndex]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else {
        if (!video.srcObject) {
          const stream = canvas.captureStream(10); // Capture 10 frames per second
          video.srcObject = stream;
          
          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => {
              video.play().then(() => resolve()).catch(() => resolve());
            };
          });
        }
        await video.requestPictureInPicture();
        setPipActive(true);
      }
    } catch (e) {
      console.warn("Native Picture-in-Picture is disabled, not supported by browser, or user denied:", e);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement && e.code === 'Space') {
        // Let buttons handle space if focused
        if (e.target instanceof HTMLInputElement) return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.key.toLowerCase() === 'r') {
        resetTimer();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        togglePictureInPicture();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTimer, resetTimer, togglePictureInPicture]);

  // Before Unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Update Media Session and Tab Title
  useEffect(() => {
    const formatted = formatTime(timeLeft);
    const modeLabel = mode === 'focus' ? 'Focusing' : mode === 'break' ? 'Break Time' : 'Ready';
    
    document.title = mode === 'idle' ? 'Focus Timer' : `${formatted} - ${modeLabel}`;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${formatted} - ${modeLabel}`,
        artist: 'Focus Timer',
        album: mode === 'focus' ? 'Stay focused!' : 'Take a breather.',
        artwork: [
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
    }
  }, [timeLeft, mode]);

  // Listen for Picture-in-Picture events to sync state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setPipActive(true);
    const handleLeavePiP = () => setPipActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  // Update canvas for Picture-in-Picture
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 400;
    canvas.height = 200;

    // Background base fills
    ctx.fillStyle = isDarkMode ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dynamic glowing radial gradient matching background color theme
    const gradient = ctx.createRadialGradient(200, 100, 10, 200, 100, 180);
    if (mode === 'focus') {
      gradient.addColorStop(0, isDarkMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(254, 226, 226, 0.9)');
    } else if (mode === 'break') {
      gradient.addColorStop(0, isDarkMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(209, 250, 229, 0.9)');
    } else {
      gradient.addColorStop(0, isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(219, 234, 254, 0.8)');
    }
    gradient.addColorStop(1, isDarkMode ? '#0f172a' : '#f8fafc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Inner Border Line
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    // Mode Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px "Inter", sans-serif';
    if (mode === 'focus') {
      ctx.fillStyle = isDarkMode ? '#f87171' : '#b91c1c';
      ctx.fillText('FOCUS SESSION', 200, 42);
    } else if (mode === 'break') {
      ctx.fillStyle = isDarkMode ? '#4ade80' : '#047857';
      ctx.fillText('BREAK TIME', 200, 42);
    } else {
      ctx.fillStyle = isDarkMode ? '#94a3b8' : '#475569';
      ctx.fillText('READY TO WORK', 200, 42);
    }

    // Larger, high-contrast monospace time
    ctx.font = '300 76px monospace';
    ctx.fillStyle = isDarkMode ? '#ffffff' : '#0f172a';
    ctx.fillText(formatTime(timeLeft), 200, 108);

    // Bottom session info metadata
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.5)';
    
    let subLabel = '';
    if (activeTask) {
      subLabel = `${activeTask.title} (${activeCycleIndex + 1}/${activeTask.cycles.length})`;
    } else if (activeRoutine) {
      subLabel = `${activeRoutine.name} (${activeCycleIndex + 1}/${activeRoutine.tasks.length})`;
    } else if (cycleCount > 0) {
      subLabel = `Cycle ${cycleCount}`;
    } else {
      subLabel = 'Simple Mode';
    }

    if (subLabel.length > 36) {
      subLabel = subLabel.substring(0, 33) + '...';
    }
    ctx.fillText(subLabel.toUpperCase(), 200, 162);
  }, [timeLeft, mode, activeTask, activeRoutine, activeCycleIndex, isDarkMode, cycleCount]);

  const isFocusing = mode === 'focus';
  const isBreaking = mode === 'break';
  
  const currentTotalTime = mode === 'break' ? breakTime : focusTime;
  const progressPercentage = currentTotalTime > 0 ? ((currentTotalTime - timeLeft) / currentTotalTime) * 100 : 0;

  return (
    <MotionConfig reducedMotion="never">
      <div className={`min-h-screen transition-colors duration-1000 flex flex-col items-center justify-center relative overflow-hidden z-0 ${isDarkMode ? 'dark text-white' : 'text-slate-900'}`}>
      
      {/* Liquid Glass Background */}
      <LiquidBackground isFocusing={isFocusing} isBreaking={isBreaking} isDarkMode={isDarkMode} />

      {/* Shared Corner Tools */}
      <div className="absolute top-6 right-6 flex gap-3 z-50">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 glass-button opacity-50 hover:opacity-100 focus:outline-none"
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-3 glass-button opacity-50 hover:opacity-100 focus:outline-none"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
      {currentTab === 'tasks' && (
        <motion.div key="tasks" initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }} transition={{ duration: 0.3 }} className="w-full h-full flex flex-col items-center">
          <TasksPage tasks={tasks} setTasks={setTasks} onStartTask={handleStartTask} onNavigateHome={() => setCurrentTab('timer')} />
        </motion.div>
      )}
      
      {currentTab === 'routines' && (
        <motion.div key="routines" initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }} transition={{ duration: 0.3 }} className="w-full h-full flex flex-col items-center">
          <RoutinesPage routines={routines} setRoutines={setRoutines} onStartRoutine={handleStartRoutine} onNavigateHome={() => setCurrentTab('timer')} />
        </motion.div>
      )}

      {currentTab === 'timer' && (
        <motion.div key="timer" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="glass-panel w-full max-w-[90vw] sm:max-w-md md:max-w-2xl min-h-[50vh] flex flex-col items-center justify-center relative p-8 sm:p-12 z-10 mx-auto" style={{ backdropFilter: 'blur(80px) saturate(150%)', WebkitBackdropFilter: 'blur(80px) saturate(150%)' }}>

        {/* Top Bar for Mode/Status - Only visible when not idle */}
        <div className={`absolute top-8 w-full flex justify-center items-center transition-opacity duration-700 z-10 ${mode !== 'idle' ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[11px] md:text-[14px] uppercase tracking-[0.3em] md:tracking-[0.4em] text-white/60 text-center font-medium">
            {mode === 'focus' ? 'Focus Session Running' : mode === 'break' ? 'Break Time' : ''}
          </p>
        </div>

        {/* Main Timer Display */}
        <div className="z-10 flex flex-col items-center w-full px-4 mt-12 sm:mt-8">
          {activeTask && (
            <div className="mb-4 sm:mb-8 text-center text-white/90 transition-opacity w-full max-w-xs sm:max-w-md">
              <h2 className="text-xl sm:text-2xl font-medium tracking-wide uppercase mb-1 drop-shadow-md">{activeTask.title}</h2>
              <p className="text-sm tracking-[0.1em] uppercase text-white/60 mb-4">{activeTask.cycles[activeCycleIndex]?.name}</p>
              {mode !== 'idle' && (
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className="h-full bg-white transition-all duration-500 ease-linear shadow-[0_0_10px_white]" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {activeRoutine && (
            <div className="mb-4 sm:mb-8 text-center text-white/90 transition-opacity w-full max-w-xs sm:max-w-md">
              <h2 className="text-xl sm:text-2xl font-medium tracking-wide uppercase mb-1 drop-shadow-md">{activeRoutine.name}</h2>
              <p className="text-sm tracking-[0.1em] uppercase text-white/60 mb-4">{activeRoutine.tasks[activeCycleIndex]?.name}</p>
              {mode !== 'idle' && (
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className="h-full bg-white transition-all duration-500 ease-linear shadow-[0_0_10px_white]" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              )}
            </div>
          )}
          <h1 className="text-[25vw] sm:text-[20vw] md:text-[150px] font-[200] leading-none tracking-[-0.05em] select-none text-center drop-shadow-lg" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(timeLeft)}
          </h1>
        </div>

        {/* Primary Controls */}
        <div className={`z-10 mt-10 flex items-center justify-center gap-6 sm:gap-10 transition-opacity duration-500`}>
          <button
            onClick={resetTimer}
            className="w-[50px] h-[50px] shrink-0 glass-button flex justify-center items-center focus:outline-none"
            title="Reset (R)"
            aria-label="Reset Timer"
          >
            <RotateCcw className="w-5 h-5 text-white/80" />
          </button>

          <button
            onClick={toggleTimer}
            disabled={hardMode && mode === 'focus' && isRunning}
            className={`w-[80px] h-[80px] shrink-0 glass-button flex justify-center items-center focus:outline-none ${
              (hardMode && mode === 'focus' && isRunning) ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title="Start/Pause (Space)"
            aria-label="Start or Pause Timer"
          >
            {isRunning ? <Pause className="w-8 h-8 text-white drop-shadow-md" fill="currentColor" /> : <Play className="w-8 h-8 ml-1 text-white drop-shadow-md" fill="currentColor" />}
          </button>

          <button
            onClick={() => setBrownNoiseOn(prev => !prev)}
            className={`w-[50px] h-[50px] shrink-0 glass-button flex justify-center items-center focus:outline-none ${
              brownNoiseOn ? 'bg-white/30 border-white/50' : ''
            }`}
            title="Toggle Brown Noise"
            aria-label="Toggle Brown Noise"
          >
            {brownNoiseOn ? <Volume2 className="w-5 h-5 text-white shadow-sm" /> : <VolumeX className="w-5 h-5 text-white/80" />}
          </button>

          <button
            onClick={togglePictureInPicture}
            className={`w-[50px] h-[50px] shrink-0 glass-button flex justify-center items-center focus:outline-none ${
              pipActive ? 'bg-white/30 border-white/50' : ''
            }`}
            title="Float Timer (Picture-in-Picture)"
            aria-label="Float Timer"
          >
            <ExternalLink className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Cycle Indicator */}
        {mode !== 'idle' && !activeTask && !activeRoutine && (
          <div className="absolute bottom-6 opacity-50 font-mono tracking-wider text-xs sm:text-sm drop-shadow-sm">
            CYCLE {cycleCount}
          </div>
        )}
        {mode !== 'idle' && activeTask && (
          <div className="absolute bottom-6 opacity-50 font-mono tracking-wider text-xs sm:text-sm drop-shadow-sm">
            CYCLE {activeCycleIndex + 1} / {activeTask.cycles.length}
          </div>
        )}
        {mode !== 'idle' && activeRoutine && (
          <div className="absolute bottom-6 opacity-50 font-mono tracking-wider text-xs sm:text-sm drop-shadow-sm">
            CYCLE {activeCycleIndex + 1} / {activeRoutine.tasks.length}
          </div>
        )}
        </motion.div>
      )}
      </AnimatePresence>

      {/* Central Tools Pill */}
      <div className={`fixed bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 w-[92vw] sm:w-max max-w-[92vw] flex flex-row items-center justify-between sm:justify-center px-2 py-2 gap-1 sm:gap-2 glass-panel !rounded-[2rem] sm:!rounded-full transition-all duration-700 z-50 shadow-2xl`} style={{ backdropFilter: 'blur(80px) saturate(150%)', WebkitBackdropFilter: 'blur(80px) saturate(150%)' }}>
        <button
          onClick={() => setCurrentTab('timer')}
          className={`flex-1 sm:flex-none px-2 sm:px-6 py-3 sm:py-4 rounded-3xl sm:rounded-full flex flex-col items-center gap-1 transition-all duration-300 ${currentTab === 'timer' ? 'bg-black/10 dark:bg-white/20 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
        >
          <Timer className="w-5 h-5 opacity-90" />
          <span className="text-[10px] font-medium tracking-wide opacity-90">Timer</span>
        </button>
        <button
          onClick={() => setCurrentTab('routines')}
           className={`flex-1 sm:flex-none px-2 sm:px-6 py-3 sm:py-4 rounded-3xl sm:rounded-full flex flex-col items-center gap-1 transition-all duration-300 ${currentTab === 'routines' ? 'bg-black/10 dark:bg-white/20 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
        >
          <Calendar className="w-5 h-5 opacity-90" />
          <span className="text-[10px] font-medium tracking-wide opacity-90">Routines</span>
        </button>
        <button
          onClick={() => setCurrentTab('tasks')}
           className={`flex-1 sm:flex-none px-2 sm:px-6 py-3 sm:py-4 rounded-3xl sm:rounded-full flex flex-col items-center gap-1 transition-all duration-300 ${currentTab === 'tasks' ? 'bg-black/10 dark:bg-white/20 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
        >
          <ListTodo className="w-5 h-5 opacity-90" />
          <span className="text-[10px] font-medium tracking-wide opacity-90">Tasks</span>
        </button>
        <div className="hidden sm:block w-[1px] h-10 bg-black/10 dark:bg-white/20 mx-1" />
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex-1 sm:flex-none px-2 sm:px-6 py-3 sm:py-4 rounded-3xl sm:rounded-full flex flex-col items-center gap-1 transition-all duration-300 ${showSettings ? 'bg-black/10 dark:bg-white/20 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
        >
          {showSettings ? <X className="w-5 h-5 opacity-90" /> : <Settings className="w-5 h-5 opacity-90" />}
          <span className="text-[10px] font-medium tracking-wide opacity-90">{showSettings ? 'Close' : 'Settings'}</span>
        </button>
      </div>

      {/* Settings Overlay */}
      <AnimatePresence>
      {showSettings && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-2xl" style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }} className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-10 space-y-8 shadow-2xl relative dark:text-white" style={{ backdropFilter: 'blur(60px) saturate(200%)', WebkitBackdropFilter: 'blur(60px) saturate(200%)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-medium tracking-tight drop-shadow-md">Configuration</h2>
               <button onClick={() => setShowSettings(false)} className="p-2 glass-button focus:outline-none">
                  <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="space-y-8">
              {/* Cycle Mode */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-lg text-slate-900 dark:text-white/90">Timer Mode</h3>
                    <p className="text-slate-500 dark:text-white/50 text-sm mt-1">Focus / Break durations</p>
                  </div>
                  <Timer className="w-6 h-6 text-slate-500 dark:text-white/50" />
                </div>
                <div className="flex bg-black/5 dark:bg-white/10 p-1 rounded-full border border-black/10 dark:border-white/10 w-fit gap-1 shadow-inner">
                  <button
                    onClick={() => setCycleConfig('10/2')}
                    className={`py-2 px-6 rounded-full text-xs font-semibold tracking-[0.05em] uppercase transition-all duration-300 ${cycleConfig === '10/2' ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    10 / 2 Cycle
                  </button>
                   <button
                    onClick={() => setCycleConfig('15/3')}
                    className={`py-2 px-6 rounded-full text-xs font-semibold tracking-[0.05em] uppercase transition-all duration-300 ${cycleConfig === '15/3' ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    15 / 3 Cycle
                  </button>
                </div>
              </div>

              <hr className="border-black/10 dark:border-white/10" />

              {/* Hard Mode */}
              <div className="flex items-center justify-between group cursor-pointer" onClick={() => setHardMode(!hardMode)}>
                <div>
                  <h3 className="font-medium text-lg text-slate-900 dark:text-white/90">Hard Mode</h3>
                  <p className="text-slate-500 dark:text-white/50 text-sm mt-1 max-w-[250px]">Disables the pause button during active focus sessions.</p>
                </div>
                <div className={`w-14 h-8 rounded-full transition-colors relative flex items-center shrink-0 shadow-inner ${hardMode ? 'bg-slate-800 dark:bg-white/80' : 'bg-black/5 border border-black/10 dark:bg-white/20 dark:border-white/20'}`}>
                  <div className={`w-6 h-6 rounded-full ${hardMode ? 'bg-white dark:bg-black/80' : 'bg-slate-400 dark:bg-white/80'} absolute transition-transform transform shadow-md ${hardMode ? 'translate-x-7' : 'translate-x-1'}`} />
                </div>
              </div>
            </div>

            <button
               onClick={() => setShowSettings(false)}
               className="w-full py-4 text-center glass-button !bg-black/5 hover:!bg-black/10 dark:!bg-white/20 dark:hover:!bg-white/30 font-semibold tracking-wide uppercase text-sm mt-4 text-slate-900 dark:text-white drop-shadow-md"
             >
               Done
             </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Hint */}
      <div className={`absolute bottom-6 z-0 text-center space-x-6 sm:space-x-8 font-mono text-[10px] text-white/40 tracking-[0.1em] uppercase transition-opacity duration-500 drop-shadow-sm ${mode !== 'idle' ? '!opacity-0' : ''}`}>
        <span>[Space] Start / Pause</span>
        <span>[R] Reset</span>
        <span className="hidden sm:inline">[P] Float</span>
        <span className="hidden sm:inline">[F] Fullscreen</span>
      </div>

      {/* Floating In-App Mini-Timer widget when navigating tasks/routines */}
      <AnimatePresence>
      {currentTab !== 'timer' && (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 w-max max-w-[92vw] z-[45] glass-panel !rounded-full px-5 py-3 flex items-center justify-center gap-4 shadow-xl border border-white/20 dark:border-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-300 bg-white/50 dark:bg-black/40"
          style={{ backdropFilter: 'blur(80px) saturate(150%)', WebkitBackdropFilter: 'blur(80px) saturate(150%)' }}
          onClick={() => setCurrentTab('timer')}
        >
          <div className={`w-3 h-3 rounded-full ${mode === 'focus' ? 'bg-rose-500 animate-pulse' : mode === 'break' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="font-mono text-lg font-bold tracking-tight text-slate-800 dark:text-white">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-white/70 max-w-[120px] truncate hidden sm:block">
            {mode === 'focus' ? 'Focusing' : mode === 'break' ? 'Breathing' : 'Idle'}
          </span>
          <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/20" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTimer();
            }}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/15 rounded-full transition-colors flex items-center justify-center text-slate-800 dark:text-white"
            aria-label="Toggle floating play/pause"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />}
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Behind the scenes Picture-in-Picture components */}
      <canvas ref={canvasRef} className="hidden" style={{ display: 'none' }} />
      <video ref={videoRef} className="hidden" style={{ display: 'none' }} muted playsInline />

    </div>
    </MotionConfig>
  );
}
