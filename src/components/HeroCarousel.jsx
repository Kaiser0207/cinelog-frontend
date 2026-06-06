import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import HeroCard from './HeroCard';

/**
 * Auto-advancing hero carousel of the manually-featured reviews.
 * - Slides right every `interval` ms and loops back to the start.
 * - Finger/mouse drag follows 1:1 and snaps to the nearest slide on release.
 * - Dot indicators jump to a specific slide.
 * Falls back to a single static HeroCard when only one review is featured.
 */
export default function HeroCarousel({ reviews = [], interval = 8000 }) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const containerRef = useRef(null);
  const indexRef = useRef(0);
  const timer = useRef(null);
  const x = useMotionValue(0);
  const n = reviews.length;

  // Measure one slide's width (== container width) and realign on resize.
  useEffect(() => {
    const measure = () => {
      const w = containerRef.current?.offsetWidth || 0;
      setWidth(w);
      x.set(-indexRef.current * w);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // Snap to the active slide whenever it changes.
  useEffect(() => {
    indexRef.current = index;
    if (width) {
      animate(x, -index * width, { type: 'spring', stiffness: 260, damping: 30 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width]);

  const start = () => {
    stop();
    if (n > 1) timer.current = setInterval(() => setIndex((i) => (i + 1) % n), interval);
  };
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
  };

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, interval]);

  useEffect(() => {
    if (index > n - 1) setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  if (n === 0) return null;
  if (n === 1) return <HeroCard review={reviews[0]} />;

  const goTo = (i) => {
    setIndex((i + n) % n);
    start(); // reset the auto-advance timer after manual interaction
  };

  const handleDragEnd = (e, info) => {
    const { offset, velocity } = info;
    let target = index;
    if (offset.x < -width * 0.2 || velocity.x < -400) target = index + 1;
    else if (offset.x > width * 0.2 || velocity.x > 400) target = index - 1;
    goTo(Math.max(0, Math.min(n - 1, target)));
  };

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-3xl">
        <motion.div
          className="flex"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -(n - 1) * width, right: 0 }}
          dragElastic={0.12}
          onDragStart={stop}
          onDragEnd={handleDragEnd}
        >
          {reviews.map((rev) => (
            <div key={rev.id} className="w-full flex-shrink-0">
              <HeroCard review={rev} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {reviews.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to featured ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === index ? 'w-6 bg-[#FE494A]' : 'w-1.5 bg-[#1A1A1A]/25 hover:bg-[#1A1A1A]/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
