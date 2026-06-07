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

  // Keep the latest index reachable from listeners/timers without stale closures.
  indexRef.current = index;

  // Measure one slide's width and keep `x` aligned through ANY layout change —
  // web-font load, mobile address-bar collapse, sidebar, late images. A plain
  // window 'resize' listener misses all of those, which is what let the slide
  // spring from a stale width and "drift" to a wrong offset. ResizeObserver
  // catches every reflow of the actual container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.offsetWidth || 0;
      if (!w) return; // ignore 0-width (hidden/not-laid-out) so we never snap from 0
      setWidth(w);
      x.set(-indexRef.current * w); // hard re-align, no animation
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // Snap to the active slide whenever it (or the measured width) changes.
  // Cancel any in-flight spring first so rapid index changes can't stack.
  useEffect(() => {
    if (!width) return undefined;
    const controls = animate(x, -index * width, { type: 'spring', stiffness: 260, damping: 30 });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width]);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };
  const start = () => {
    stop();
    if (n > 1) {
      timer.current = setInterval(() => {
        // A backgrounded tab queues intervals and fires a burst on return,
        // jumping the carousel off-grid — skip ticks while hidden.
        if (document.hidden) return;
        setIndex((i) => (i + 1) % n);
      }, interval);
    }
  };

  useEffect(() => {
    start();
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
          dragMomentum={false}
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
