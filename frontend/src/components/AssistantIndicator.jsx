import React from 'react';
import { motion } from 'framer-motion';

export const AssistantIndicator = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
          animate={{
            y: ["0%", "-60%", "0%"],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};
