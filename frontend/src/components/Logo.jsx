import React from 'react';

export const Logo = ({ className = '', size = 32 }) => {
  return (
    <img 
      src="/logo.png" 
      alt="DD Logo" 
      width={size} 
      height={size} 
      className={`rounded-xl object-cover shadow-sm ${className}`} 
    />
  );
};
