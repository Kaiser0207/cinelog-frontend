import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [hoverText, setHoverText] = useState('');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isOverDark, setIsOverDark] = useState(false);

  useEffect(() => {
    // Detect touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
      return;
    }

    // The stylesheet used to hide the native cursor under `@media (pointer: fine)`
    // while this component bailed out on `maxTouchPoints > 0`. On a touchscreen laptop
    // (or an iPad with a trackpad) BOTH are true — the pointer is fine AND the screen
    // is touchable — so the native cursor was hidden with !important and the
    // replacement was never rendered. No pointer anywhere on the site, over any button.
    //
    // One source of truth: the CSS hides the cursor only when this component has
    // actually mounted a replacement.
    document.documentElement.classList.add('has-custom-cursor');

    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      if (e.target && e.target.closest) {
        setIsOverDark(!!e.target.closest('[data-theme="grey"]'));
      }
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
      document.documentElement.classList.remove('has-custom-cursor');
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
        backgroundColor: isOverDark 
          ? (isHovering ? '#D480C0' : '#FE494A') 
          : (isHovering ? '#FE494A' : '#D480C0'),
        mixBlendMode: isHovering ? 'normal' : 'normal',
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 28,
        mass: 0.5,
      }}
    >
      {isHovering && (
        <span className={`${isOverDark ? 'text-black' : 'text-white'} font-black font-bebas text-base tracking-widest`}>
          {hoverText}
        </span>
      )}
    </motion.div>
  );
}
