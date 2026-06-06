import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import HeroCard from './HeroCard';

/**
 * Auto-advancing hero carousel of the manually-featured reviews.
 * - Slides right every `interval` ms and loops back to the start.
 * - Manual control via finger/mouse swipe and the dot indicators.
 * Falls back to a single static HeroCard when only one review is featured.
 */
export default function HeroCarousel({ reviews = [], interval = 5000 }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const n = reviews.length;

  const start = () => {
    stop();
    if (n > 1) {
      timer.current = setInterval(() => setIndex((i) => (i + 1) % n), interval);
    }
  };
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
  };

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, interval]);

  // Keep index valid if the featured set shrinks.
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

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-3xl">
        <motion.div
          className="flex"
          animate={{ x: `-${index * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={stop}
          onDragEnd={(e, info) => {
            if (info.offset.x < -60) goTo(index + 1);
            else if (info.offset.x > 60) goTo(index - 1);
            else start();
          }}
        >
          {reviews.map((rev) => (
            <div key={rev.id} className="w-full flex-shrink-0">
              <HeroCard review={rev} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-1">
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
