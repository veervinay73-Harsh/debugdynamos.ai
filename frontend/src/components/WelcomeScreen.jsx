import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from './Logo';

const getUserName = (user) => {
  if (!user) return '';
  if (user.displayName) return user.displayName;
  if (user.name) return user.name;
  if (user.email) {
    const localPart = user.email.split('@')[0];
    if (localPart.toLowerCase().startsWith('vinayveer')) {
      return 'Vinay Veer';
    }
    const parts = localPart.split(/[\._-]/);
    const cleanedParts = parts.map(part => {
      const noDigits = part.replace(/\d+/g, '').trim();
      return noDigits.charAt(0).toUpperCase() + noDigits.slice(1);
    }).filter(Boolean);
    return cleanedParts.join(' ') || localPart;
  }
  return '';
};

export const WelcomeScreen = ({ user, onSelectPrompt }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-3xl mx-auto px-4 text-center select-none">
      
      {/* AI Logo Animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 1 }}
        className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-850 flex items-center justify-center shadow-lg mb-6"
      >
        <Logo size={48} className="animate-pulse" />
      </motion.div>

      {/* Greeting */}
      <motion.h1
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="text-3xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display mb-3"
      >
        Hi {getUserName(user)}, how can I help you today?
      </motion.h1>

    </div>
  );
};
