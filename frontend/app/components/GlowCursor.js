'use client';
import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function GlowCursor() {
  const [isTouch, setIsTouch] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfigInner = { stiffness: 500, damping: 28 };
  const springConfigOuter = { stiffness: 150, damping: 20 };

  const springX = useSpring(cursorX, springConfigInner);
  const springY = useSpring(cursorY, springConfigInner);

  const lagX = useSpring(cursorX, springConfigOuter);
  const lagY = useSpring(cursorY, springConfigOuter);

  useEffect(() => {
    // Detect touch device
    const touchMediaQuery = window.matchMedia('(pointer: coarse)');
    setIsTouch(touchMediaQuery.matches);

    const handleMouseMove = (e) => {
      cursorX.set(e.clientX - 8);
      cursorY.set(e.clientY - 8);
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [cursorX, cursorY]);

  if (isTouch) return null;

  return (
    <>
      {/* Inner dot */}
      <motion.div
        style={{
          position: 'fixed',
          left: springX,
          top: springY,
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: '#ff1f3d',
          pointerEvents: 'none',
          zIndex: 99999,
          transformOrigin: 'center center',
        }}
        animate={{
          scale: isClicked ? 0.6 : 1,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      />

      {/* Outer ring */}
      <motion.div
        style={{
          position: 'fixed',
          left: lagX,
          top: lagY,
          x: -12,
          y: -12,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1.5px solid rgba(255, 31, 61, 0.5)',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 0 15px rgba(255, 31, 61, 0.3)',
          transformOrigin: 'center center',
        }}
        animate={{
          scale: isClicked ? 1.5 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      />
    </>
  );
}
