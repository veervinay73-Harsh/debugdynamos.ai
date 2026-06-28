import React from 'react';

export const Logo = ({ className = '', size = 32 }) => {
  return (
    <img 
      src="/logo.jpg" 
      alt="talkwithme.in Logo" 
      width={size} 
      height={size} 
      className={`rounded-xl object-cover shadow-sm ${className}`} 
    />
  );
};
