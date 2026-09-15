import { useEffect, useRef, memo } from 'react';

import './DotField.css';

const TWO_PI = Math.PI * 2;

// A displaced dot counts as "home" once it is this close to its anchor. The dots are
// under a pixel in radius, so the snap is invisible — but without it the 0.1 lerp
// never quite lands, and every dot the cursor has ever brushed would stay in the
// per-frame redraw set for good.
const SETTLE_EPS = 0.2;

const DotField = memo(({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = 'rgba(168, 85, 247, 0.35)',
  gradientTo = 'rgba(180, 151, 207, 0.25)',
  glowColor = '#120F17',
  ...rest
}) => {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const glowRef = useRef(null);
  const dotsRef = useRef([]);
  const gridRef = useRef({ cols: 0, rows: 0, step: 0, padX: 0, padY: 0 });
  const gradRef = useRef(null);
  // Indices of dots currently away from their anchor — see tickRegion().
  const activeRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 });
  const rafRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0, offsetX: 0, offsetY: 0 });
  const glowOpacity = useRef(0);
  const engagement = useRef(0);
  const propsRef = useRef({});
  propsRef.current = { dotRadius, dotSpacing, cursorRadius, cursorForce, bulgeOnly, bulgeStrength, sparkle, waveAmplitude, gradientFrom, gradientTo };
  const rebuildRef = useRef(null);
  const glowIdRef = useRef(`dot-field-glow-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glowEl = glowRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let resizeTimer;

    // This is a field of dots that bulges away from THE CURSOR. A phone does not have
    // one — and iOS Safari synthesises a `mousemove` before every single click. So on a
    // touchscreen the thing woke up on every tap: the mouse "jumps" from (-9999,-9999),
    // `speed` spikes, and `engagement` lerps back down at 0.06/frame — a hundred-odd
    // frames during which tick() does a full clearRect, builds a fresh gradient, and
    // issues ~1,000 ctx.arc() calls. That's a second or two of full-canvas repainting
    // beginning on the exact frame the pull-out's 3D animation starts.
    //
    // On touch: build the grid, paint it ONCE, and never start the loop. Identical
    // picture, no listeners, no interval, no rAF.
    const INTERACTIVE =
      (window.matchMedia?.('(hover: hover)').matches ?? true) &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let frameCount = 0;
    let idleFrames = 0;
    let fullPaintPending = false;

    function resize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    }

    function doResize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Viewport-relative offsets (no scrollX/Y). This field is a FIXED backdrop,
      // so its rect never moves as you scroll — folding the scroll offset in here
      // would freeze it at whatever the scroll position was on the last resize and
      // the cursor would drift away from the dots the moment you scrolled.
      sizeRef.current = { w, h, offsetX: rect.left, offsetY: rect.top };

      buildDots(w, h);
      buildGradient(w, h);
      paintAfterRebuild();
    }

    // The canvas is blank after a rebuild. If the loop is running, its next frame
    // repaints everything; otherwise (touch, reduced-motion, or a parked desktop
    // loop) paint here. tickFull() is the same full pass the loop would do — on a
    // non-interactive device schedule() is a no-op inside it, so it paints exactly
    // once and nothing else ever runs.
    function paintAfterRebuild() {
      activeRef.current = [];
      idleFrames = 0;
      if (rafRef.current == null) tickFull();
      else fullPaintPending = true;
    }

    function buildDots(w, h) {
      const p = propsRef.current;
      const step = p.dotRadius + p.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;
      const dots = new Array(rows * cols);
      let idx = 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
        }
      }
      dotsRef.current = dots;
      gridRef.current = { cols, rows, step, padX, padY };
    }

    // The gradient spans the whole canvas, so a partial redraw with the same
    // gradient lands on exactly the same colours. Build it once per size, not per frame.
    function buildGradient(w, h) {
      const p = propsRef.current;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, p.gradientFrom);
      grad.addColorStop(1, p.gradientTo);
      gradRef.current = grad;
    }

    function onMouseMove(e) {
      const s = sizeRef.current;
      mouseRef.current.x = e.clientX - s.offsetX;
      mouseRef.current.y = e.clientY - s.offsetY;
      // The loop parks itself once everything has settled; the first movement wakes it.
      if (rafRef.current == null && !document.hidden) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    function updateMouseSpeed() {
      const m = mouseRef.current;
      const dx = m.prevX - m.x;
      const dy = m.prevY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      m.speed += (dist - m.speed) * 0.5;
      if (m.speed < 0.001) m.speed = 0;
      m.prevX = m.x;
      m.prevY = m.y;
    }

    const speedInterval = INTERACTIVE ? setInterval(updateMouseSpeed, 20) : null;

    const schedule = () => {
      if (INTERACTIVE) rafRef.current = requestAnimationFrame(tick);
    };

    function advanceEngagement() {
      const m = mouseRef.current;
      const targetEngagement = Math.min(m.speed / 5, 1);
      engagement.current += (targetEngagement - engagement.current) * 0.06;
      if (engagement.current < 0.001) engagement.current = 0;
      return engagement.current;
    }

    function updateGlow(eng) {
      const m = mouseRef.current;
      glowOpacity.current += (eng - glowOpacity.current) * 0.08;
      if (glowEl) {
        glowEl.setAttribute('cx', m.x);
        glowEl.setAttribute('cy', m.y);
        glowEl.style.opacity = glowOpacity.current;
      }
    }

    // Paint every dot where it currently sits, nothing else.
    function drawAll() {
      const dots = dotsRef.current;
      const { w, h } = sizeRef.current;
      const rad = propsRef.current.dotRadius / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = gradRef.current;
      ctx.beginPath();
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        ctx.moveTo(d.sx + rad, d.sy);
        ctx.arc(d.sx, d.sy, rad, 0, TWO_PI);
      }
      ctx.fill();
    }

    function tick() {
      const p = propsRef.current;
      if (p.bulgeOnly && !p.sparkle && p.waveAmplitude === 0) tickRegion();
      else tickFull();
    }

    // Default (bulge) mode. Only dots near the cursor, or still springing back from
    // it, can differ from the last frame — so clear and redraw just that rectangle.
    // At 1080p that is ~3k dots a frame instead of 6.6k; at 4K, ~3k instead of 26k.
    // Once nothing is moving the loop parks itself and costs nothing at all.
    function tickRegion() {
      const dots = dotsRef.current;
      const m = mouseRef.current;
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      const eng = advanceEngagement();
      updateGlow(eng);

      if (fullPaintPending) {
        fullPaintPending = false;
        drawAll();
      }

      const cr = p.cursorRadius;
      const engaged = eng > 0.01;
      const active = activeRef.current;

      // Bounding box of everything that can change this frame: the cursor's reach,
      // plus the anchors of dots still on their way home.
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      if (engaged) {
        x0 = m.x - cr; x1 = m.x + cr;
        y0 = m.y - cr; y1 = m.y + cr;
      }
      for (let k = 0; k < active.length; k++) {
        const d = dots[active[k]];
        if (d.ax < x0) x0 = d.ax;
        if (d.ax > x1) x1 = d.ax;
        if (d.ay < y0) y0 = d.ay;
        if (d.ay > y1) y1 = d.ay;
      }

      if (x0 === Infinity) {
        // Nothing to redraw. Park once the glow has faded, the speed sampler reads
        // zero, AND it has consumed the latest position. That last check is what
        // saves a lone mousemove: it wakes the loop, but the very next frame can run
        // before the 20 ms sampler does — speed is still 0, and parking here would
        // drop the bulge, because nothing else ever restarts the loop. While the
        // sampler is behind (x !== prevX) keep ticking. onMouseMove restarts the loop.
        if (eng === 0 && glowOpacity.current < 0.005 && m.speed === 0
          && m.x === m.prevX && m.y === m.prevY) {
          rafRef.current = null;
          return;
        }
        schedule();
        return;
      }

      // Pad by the furthest a dot can be from its anchor — the lerp approaches its
      // target and never overshoots, and the target is at most bulgeStrength away —
      // then snap the rectangle OUTWARD to the midlines between grid columns/rows.
      // The snap matters: a dot straddling the clear edge would be half-erased, and
      // repainting it over the surviving half would stack its alpha a little more
      // every frame.
      const pad = p.bulgeStrength + p.dotRadius + 2;
      x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      const { cols, rows, step, padX, padY } = gridRef.current;
      const c0 = Math.max(0, Math.floor((x0 - padX) / step));
      const c1 = Math.min(cols - 1, Math.ceil((x1 - padX) / step) - 1);
      const r0 = Math.max(0, Math.floor((y0 - padY) / step));
      const r1 = Math.min(rows - 1, Math.ceil((y1 - padY) / step) - 1);
      if (c1 < c0 || r1 < r0) {
        // Cursor is off the canvas and nothing is displaced.
        schedule();
        return;
      }

      const clearX = c0 === 0 ? 0 : padX + c0 * step;
      const clearY = r0 === 0 ? 0 : padY + r0 * step;
      const clearR = c1 === cols - 1 ? w : padX + (c1 + 1) * step;
      const clearB = r1 === rows - 1 ? h : padY + (r1 + 1) * step;
      ctx.clearRect(clearX, clearY, clearR - clearX, clearB - clearY);

      ctx.fillStyle = gradRef.current;
      const crSq = cr * cr;
      const rad = p.dotRadius / 2;
      const nextActive = [];
      ctx.beginPath();

      for (let row = r0; row <= r1; row++) {
        const base = row * cols;
        for (let col = c0; col <= c1; col++) {
          const i = base + col;
          const d = dots[i];
          const dx = m.x - d.ax;
          const dy = m.y - d.ay;
          const distSq = dx * dx + dy * dy;

          if (engaged && distSq < crSq) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / cr;
            const push = t * t * p.bulgeStrength * eng;
            const angle = Math.atan2(dy, dx);
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
          } else if (d.sx !== d.ax || d.sy !== d.ay) {
            d.sx += (d.ax - d.sx) * 0.1;
            d.sy += (d.ay - d.sy) * 0.1;
            if (Math.abs(d.sx - d.ax) < SETTLE_EPS && Math.abs(d.sy - d.ay) < SETTLE_EPS) {
              d.sx = d.ax;
              d.sy = d.ay;
            }
          }

          if (d.sx !== d.ax || d.sy !== d.ay) nextActive.push(i);

          ctx.moveTo(d.sx + rad, d.sy);
          ctx.arc(d.sx, d.sy, rad, 0, TWO_PI);
        }
      }

      ctx.fill();
      activeRef.current = nextActive;
      schedule();
    }

    // Full-frame pass: every dot gets its physics and is redrawn. This is what the
    // component always did, and it is still the only correct choice when every dot
    // moves every frame (wave), dots change look at random (sparkle), or in the
    // velocity mode where dots far from the cursor can still be drifting. It is also
    // the one-off paint on touch and after a rebuild.
    function tickFull() {
      frameCount++;
      const dots = dotsRef.current;
      const m = mouseRef.current;
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      const len = dots.length;
      const t = frameCount * 0.02;

      const eng = advanceEngagement();

      // Once the cursor stops (or on touch, where it never moves at all) the dots
      // spring back to a grid that's identical every frame. Redrawing it 60×/s is
      // pure battery burn — hold the last frame instead. Any mouse movement makes
      // eng > 0 again and this unlatches immediately.
      const canIdle = eng === 0 && glowOpacity.current < 0.005
        && !p.sparkle && p.waveAmplitude === 0;
      idleFrames = canIdle ? idleFrames + 1 : 0;
      if (idleFrames > 40) {
        schedule();
        return;
      }

      updateGlow(eng);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = gradRef.current;

      const cr = p.cursorRadius;
      const crSq = cr * cr;
      const rad = p.dotRadius / 2;
      const isBulge = p.bulgeOnly;

      ctx.beginPath();

      for (let i = 0; i < len; i++) {
        const d = dots[i];
        const dx = m.x - d.ax;
        const dy = m.y - d.ay;
        const distSq = dx * dx + dy * dy;

        if (distSq < crSq && eng > 0.01) {
          const dist = Math.sqrt(distSq);
          if (isBulge) {
            const t = 1 - dist / cr;
            const push = t * t * p.bulgeStrength * eng;
            const angle = Math.atan2(dy, dx);
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
          } else {
            const angle = Math.atan2(dy, dx);
            const move = (500 / dist) * (m.speed * p.cursorForce);
            d.vx += Math.cos(angle) * -move;
            d.vy += Math.sin(angle) * -move;
          }
        } else if (isBulge) {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }

        if (!isBulge) {
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x = d.ax + d.vx;
          d.y = d.ay + d.vy;
          d.sx += (d.x - d.sx) * 0.1;
          d.sy += (d.y - d.sy) * 0.1;
        }

        let drawX = d.sx;
        let drawY = d.sy;
        if (p.waveAmplitude > 0) {
          drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
          drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
        }

        if (p.sparkle) {
          const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
          if ((hash % 100) < 3) {
            ctx.moveTo(drawX + rad * 1.8, drawY);
            ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
          } else {
            ctx.moveTo(drawX + rad, drawY);
            ctx.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      }

      ctx.fill();

      schedule();
    }

    // Don't burn a rAF loop + a full canvas repaint on a backgrounded tab.
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    doResize();   // on touch this also paints the one and only frame
    window.addEventListener('resize', resize);
    if (INTERACTIVE) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    }

    rebuildRef.current = () => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        buildDots(w, h);
        buildGradient(w, h);
        paintAfterRebuild();
      }
    };

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      clearInterval(speedInterval);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [dotRadius, dotSpacing, gradientFrom, gradientTo]);

  return (
    <div className="dot-field-container" {...rest}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <radialGradient id={glowIdRef.current}>
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle
          ref={glowRef}
          cx="-9999"
          cy="-9999"
          r={glowRadius}
          fill={`url(#${glowIdRef.current})`}
          style={{ opacity: 0, willChange: 'opacity' }}
        />
      </svg>
    </div>
  );
});

DotField.displayName = 'DotField';

export default DotField;
