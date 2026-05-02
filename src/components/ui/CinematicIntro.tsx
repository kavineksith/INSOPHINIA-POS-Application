'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import Image from 'next/image';

const loadingStates = [
  "Initializing Secure POS Core...",
  "Loading Database modules...",
  "Verifying system integrity...",
  "Syncing local cache...",
  "Establishing secure session...",
  "System Ready."
];

export default function CinematicIntro() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [loadingText, setLoadingText] = useState(loadingStates[0]);

  useEffect(() => {
    const introPlayed = sessionStorage.getItem('introPlayed');
    if (introPlayed) {
      setIsVisible(false);
      setHasPlayed(true);
      return;
    }

    // Cycle through loading states
    let stateIndex = 0;
    const stateInterval = setInterval(() => {
      stateIndex++;
      if (stateIndex < loadingStates.length) {
        setLoadingText(loadingStates[stateIndex]);
      }
    }, 1200);

    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('introPlayed', 'true');
      setTimeout(() => setHasPlayed(true), 1000);
    }, 8000); // 8 seconds duration

    return () => {
      clearTimeout(timer);
      clearInterval(stateInterval);
    };
  }, []);

  if (hasPlayed) return null;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0b] overflow-hidden"
          >
            {/* Ambient Background */}
            <motion.div 
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.15 }}
              transition={{ duration: 6, ease: 'easeOut' }}
              className="absolute inset-0 bg-gradient-to-tr from-indigo-900/40 via-transparent to-blue-900/30 blur-3xl"
            />

            <div className="relative flex flex-col items-center">
              {/* Logo with Magic Border Beam */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                className="relative p-[1px] rounded-[2.5rem] overflow-hidden bg-white/5 shadow-2xl"
              >
                {/* Border Beam Animation */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-100%] z-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,#6366f1_360deg)] opaicty-40"
                  style={{ borderRadius: 'inherit' }}
                />

                <div className="relative z-10 bg-[#0a0a0b] rounded-[2.45rem] p-8 flex items-center justify-center">
                  <Image 
                    src="/insophinia_logo.png" 
                    alt="INSOPHINIA Logo" 
                    width={160} 
                    height={160}
                    priority
                    unoptimized
                    className="relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                  />
                </div>
              </motion.div>

              {/* Text Reveal */}
              <div className="overflow-hidden h-12 flex items-center justify-center mt-12">
                <motion.h1
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 1.8 }}
                  className="text-white text-3xl font-bold tracking-[0.25em] font-sans uppercase"
                >
                  INSOPHINIA
                </motion.h1>
              </div>

              {/* Loading Status */}
              <motion.div
                key={loadingText}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.5, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-6 text-indigo-200/60 text-xs tracking-[0.3em] uppercase font-medium min-h-[1rem]"
              >
                {loadingText}
              </motion.div>

              {/* Progress Line */}
              <div className="mt-8 w-64 h-[1px] bg-white/5 relative overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 7, ease: 'linear', delay: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"
                />
              </div>
            </div>
            
            {/* Cinematic light streaks */}
            <motion.div
              animate={{ 
                x: ['-100%', '200%'],
                opacity: [0, 0.3, 0]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
              className="absolute top-1/3 left-0 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent rotate-[-35deg] blur-md"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
