'use client';
import { useEffect } from 'react';

export default function InteractiveBackground() {
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      
      // Update global CSS root variables for parallax
      document.documentElement.style.setProperty('--mouse-x', x);
      document.documentElement.style.setProperty('--mouse-y', y);
      
      // Calculates a -1 to 1 value for rotation
      document.documentElement.style.setProperty('--tilt-x', (y - 0.5) * 2);
      document.documentElement.style.setProperty('--tilt-y', (x - 0.5) * 2);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <div className="cinematic-noise" />
      <div className="cinematic-vignette" />
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />
    </>
  );
}
