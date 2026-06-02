import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FONTS, FONT_MAP } from '../utils/constants';

export default function FontSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hoveredFont, setHoveredFont] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentFont = FONTS.find((f) => f.name === value) || FONTS[0];

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm text-text-muted mb-1.5 font-medium">Review Font</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-bg-card border border-border-subtle rounded-xl px-4 py-3 text-left hover:border-border-active transition-colors"
      >
        <span
          className="text-text-primary"
          style={{ fontFamily: FONT_MAP[currentFont.name] }}
        >
          {currentFont.label}
        </span>
        <span className="text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded-md">
          {currentFont.category}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full glass overflow-hidden py-1"
          >
            {FONTS.map((font) => {
              const isHighlighted = hoveredFont === font.name || (hoveredFont === null && value === font.name);
              return (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => { onChange(font.name); setOpen(false); }}
                  onMouseEnter={() => setHoveredFont(font.name)}
                  onMouseLeave={() => setHoveredFont(null)}
                  className="relative w-full flex items-center justify-between px-4 py-3"
                >
                  {isHighlighted && (
                    <motion.div
                      layoutId="font-selector-highlight"
                      className="absolute inset-0 bg-[#FE494A]/30 border-l-4 border-[#FE494A]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span
                    className="relative z-10 text-text-primary"
                    style={{ fontFamily: FONT_MAP[font.name] }}
                  >
                    {font.label}
                  </span>
                  <span className="relative z-10 text-xs text-text-muted">{font.category}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
