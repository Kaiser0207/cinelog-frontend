import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [hoverText, setHoverText] = useState('');
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
      return;
    }

    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      // Find the closest parent that has a data-cursor attribute
      const target = e.target.closest('[data-cursor]');
      if (target) {
        setIsHovering(true);
        setHoverText(target.getAttribute('data-cursor') || 'WATCH');
      } else {
        setIsHovering(false);
        setHoverText('');
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (isTouchDevice) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center rounded-full"
      animate={{
        x: mousePosition.x - (isHovering ? 30 : 10),
        y: mousePosition.y - (isHovering ? 30 : 10),
        width: isHovering ? 60 : 20,
        height: isHovering ? 60 : 20,
        backgroundColor: isHovering ? 'var(--color-accent-amber)' : 'var(--color-accent-red)',
        mixBlendMode: isHovering ? 'normal' : 'difference',
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 28,
        mass: 0.5,
      }}
    >
      {isHovering && (
        <span className="text-black font-black font-[var(--font-bebas)] text-base tracking-widest">
          {hoverText}
        </span>
      )}
    </motion.div>
  );
}
