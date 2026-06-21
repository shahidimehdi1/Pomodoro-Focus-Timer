import React from 'react';
import { motion } from 'motion/react';

interface LiquidBackgroundProps {
  isFocusing?: boolean;
  isBreaking?: boolean;
  isDarkMode?: boolean;
}

export default function LiquidBackground({ isFocusing, isBreaking, isDarkMode = false }: LiquidBackgroundProps) {
  // We can use a rich deep base for the background
  const darkBaseBg = isFocusing ? 'bg-[#2a0808]' : isBreaking ? 'bg-[#062615]' : 'bg-[#081b33]';
  const lightBaseBg = isFocusing ? 'bg-[#fff0f0]' : isBreaking ? 'bg-[#f0fff4]' : 'bg-[#f0f7ff]';
  const baseBg = isDarkMode ? darkBaseBg : lightBaseBg;

  // Resolve active theme colors to inject into radial-gradients as a soft native gradient fallback
  const color1 = isFocusing ? '#ff3b3b' : isBreaking ? '#3bff8e' : '#1875FF';
  const color2 = isFocusing ? '#ff9500' : isBreaking ? '#00ffcc' : '#00c3ff';
  const color3 = isFocusing ? '#ff0073' : isBreaking ? '#adff00' : '#9d00ff';

  return (
    <div className={`fixed inset-0 z-[-2] ${baseBg} overflow-hidden pointer-events-none transition-colors duration-[2s] isolate`}>
      {/* Ambient large glow */}
      <div className={`absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)] ${isDarkMode ? '' : 'hidden'}`} />

      {/* Blob 1 */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 120, -50, 0],
          y: [0, -80, 50, 0],
          rotate: [0, 90, 180, 360],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle at center, ${color1} 0%, rgba(255,255,255,0) 70%)`
        }}
        className={`absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] md:w-[50vw] md:h-[50vw] rounded-full blur-[80px] transition-all duration-[2s] ${
          isDarkMode ? 'mix-blend-screen opacity-80' : 'mix-blend-multiply opacity-50'
        }`}
      />
      
      {/* Blob 2 */}
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          x: [0, -100, 80, 0],
          y: [0, 100, -80, 0],
          rotate: [360, 180, 90, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle at center, ${color2} 0%, rgba(255,255,255,0) 70%)`
        }}
        className={`absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] md:w-[60vw] md:h-[60vw] rounded-full blur-[90px] transition-all duration-[2s] ${
          isDarkMode ? 'mix-blend-screen opacity-70' : 'mix-blend-multiply opacity-40'
        }`}
      />
      
      {/* Blob 3 */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 80, -80, 0],
          y: [0, 80, 80, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle at center, ${color3} 0%, rgba(255,255,255,0) 70%)`
        }}
        className={`absolute top-[20%] right-[10%] w-[50vw] h-[50vw] md:w-[40vw] md:h-[40vw] rounded-full blur-[70px] transition-all duration-[2s] ${
          isDarkMode ? 'mix-blend-screen opacity-60' : 'mix-blend-multiply opacity-50'
        }`}
      />
      
      {/* Inner highlight blob to create the "refraction" under the glass */}
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          x: [-50, 50, -50],
          y: [-50, 0, -50],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)'
        }}
        className={`absolute top-[30%] left-[30%] w-[30vw] h-[30vw] rounded-full blur-[60px] ${isDarkMode ? 'opacity-20 mix-blend-overlay' : 'opacity-60'}`}
      />
    </div>
  );
}
