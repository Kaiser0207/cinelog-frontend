import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotionConfig } from 'framer-motion';

// The spring the cursor has always used — it is what gives the follow its lag.
const FOLLOW = { type: 'spring', stiffness: 500, damping: 28, mass: 0.5 };

export default function CustomCursor() {
  // Position lives in MotionValues, not React state. `mousemove` fires at the
  // screen's refresh rate (60–144×/s) and React 19 flushes each one synchronously,
  // so routing it through setState meant a full render + commit per event — and
  // framer re-diffing the whole `animate` object and restarting the spring each
  // time. A MotionValue writes straight to the element's transform; React never
  // hears about it.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, FOLLOW);
  const springY = useSpring(rawY, FOLLOW);
  // `animate={{ x, y }}` used to go through framer's reduced-motion gate: under
  // <MotionConfig reducedMotion="user"> with the OS setting on, positional keys
  // animate instantly. useSpring bypasses that gate, so honour it here and bind
  // the raw values instead — the ring then tracks the pointer with no lag.
  const reduceMotion = useReducedMotionConfig();
  const x = reduceMotion ? rawX : springX;
  const y = reduceMotion ? rawY : springY;

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
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };

    // `mouseover` only fires when the pointer crosses an element boundary, so the
    // two `closest()` walks below run a handful of times a second, not per pixel.
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
      setIsOverDark(!!e.target.closest('[data-theme="grey"]'));
    };

    window.addEventListener('mousemove', updateMousePosition, { passive: true });
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [rawX, rawY]);

  if (isTouchDevice) return null;

  return (
    // Outer: a 0×0 point pinned to the pointer. As a flex container it keeps the
    // ring centred on that point whatever size the ring animates to — which is what
    // the old `x: mouse.x - (isHovering ? 30 : 10)` was doing by hand.
    <motion.div
      className="fixed top-0 left-0 w-0 h-0 pointer-events-none z-[9999] flex items-center justify-center"
      style={{ x, y }}
    >
      <motion.div
        className="shrink-0 flex items-center justify-center rounded-full"
        animate={{
          width: isHovering ? 60 : 20,
          height: isHovering ? 60 : 20,
          backgroundColor: isOverDark
            ? (isHovering ? '#D480C0' : '#FE494A')
            : (isHovering ? '#FE494A' : '#D480C0'),
        }}
        transition={FOLLOW}
      >
        {isHovering && (
          <span className={`${isOverDark ? 'text-black' : 'text-white'} font-black font-bebas text-base tracking-widest`}>
            {hoverText}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
