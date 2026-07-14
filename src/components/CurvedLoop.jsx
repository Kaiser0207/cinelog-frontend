import { useRef, useEffect, useState, useMemo, useId } from 'react';
import './CurvedLoop.css';

// viewBox geometry. Height is generous on purpose — see pathD.
const VB_W = 1440;
const VB_H = 280;
const BASELINE = 210;

const CurvedLoop = ({
  marqueeText = '',
  speed = 2,
  className,
  curveAmount = 400,
  direction = 'left',
  interactive = true
}) => {
  const text = useMemo(() => {
    const hasTrailing = /\s| $/.test(marqueeText);
    return (hasTrailing ? marqueeText.replace(/\s+$/, '') : marqueeText) + ' ';
  }, [marqueeText]);

  const measureRef = useRef(null);
  const textPathRef = useRef(null);
  const pathRef = useRef(null);
  const [spacing, setSpacing] = useState(0);
  const uid = useId();
  const pathId = `curve-${uid}`;
  // The baseline sits low in a TALL viewBox so the letters (which rise from it) and
  // the sag of the curve both land INSIDE the box. The original ran the path at y=40
  // in a 120-high box, so an 84px face overflowed the frame in both directions — and
  // since the <svg> only reserves the space its viewBox describes, the spill just sat
  // on top of whatever came next. That's what was covering the line beneath it.
  const pathD = `M-100,${BASELINE} Q500,${BASELINE + curveAmount} 1540,${BASELINE}`;

  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef(direction);
  const velRef = useRef(0);

  const ready = spacing > 0;
  const totalText = useMemo(
    () => (spacing ? Array(Math.ceil(1800 / spacing) + 2).fill(text).join('') : text),
    [spacing, text]
  );

  useEffect(() => {
    // getComputedTextLength() returns 0 until the webfont has actually landed, and a
    // spacing of 0 means the marquee never becomes `ready` — it just stays invisible.
    // Wait for the fonts, then measure.
    let cancelled = false;
    const measure = () => {
      if (!cancelled && measureRef.current) {
        setSpacing(measureRef.current.getComputedTextLength());
      }
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => { cancelled = true; };
  }, [text, className]);

  // Re-seed the attribute whenever the measurement changes (i.e. once, when the webfont
  // lands). React never touches startOffset again after mount: the JSX below hands it
  // the same `-spacing` string every render, so the DOM diff is a no-op and the rAF's
  // imperative writes survive. Keeping `offset` in state — which is what this used to
  // do — meant any parent re-render could snap the marquee back to where it started.
  useEffect(() => {
    if (spacing && textPathRef.current) {
      textPathRef.current.setAttribute('startOffset', `${-spacing}px`);
    }
  }, [spacing]);

  // The marquee is driven ENTIRELY by writing the startOffset attribute — no React
  // state. It used to call setOffset() on every single frame as well, which re-rendered
  // the whole SVG subtree (and rebuilt `totalText`, an Array().fill().join()) 60 times a
  // second, forever, from first paint. `offset` is only ever read to seed the initial
  // attribute; nothing downstream needs it after that. It was the single biggest
  // continuous main-thread cost on the home page, and it was competing with the shelf.
  //
  // And it's gated on visibility: this thing lives in the FOOTER. On the default shelf
  // view it is hundreds of pixels below the fold, animating for nobody. (rAF already
  // pauses in a hidden tab, so that case is covered for free.)
  const jacketRef = useRef(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = jacketRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!spacing || !ready || !onScreen) return undefined;
    let frame = 0;
    const step = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = dirRef.current === 'right' ? speed : -speed;
        const currentOffset = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
        let newOffset = currentOffset + delta;

        const wrapPoint = spacing;
        if (newOffset <= -wrapPoint) newOffset += wrapPoint;
        if (newOffset > 0) newOffset -= wrapPoint;

        textPathRef.current.setAttribute('startOffset', newOffset + 'px');
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed, ready, onScreen]);

  const onPointerDown = e => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    e.target.setPointerCapture(e.pointerId);
  };

  const onPointerMove = e => {
    if (!interactive || !dragRef.current || !textPathRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx;

    const currentOffset = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
    let newOffset = currentOffset + dx;

    const wrapPoint = spacing;
    if (newOffset <= -wrapPoint) newOffset += wrapPoint;
    if (newOffset > 0) newOffset -= wrapPoint;

    // Same as the rAF: the attribute IS the state. No re-render per pointermove either.
    textPathRef.current.setAttribute('startOffset', newOffset + 'px');
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    dirRef.current = velRef.current > 0 ? 'right' : 'left';
  };

  const cursorStyle = interactive ? (dragRef.current ? 'grabbing' : 'grab') : 'auto';

  return (
    <div
      ref={jacketRef}
      className="curved-loop-jacket"
      style={{ visibility: ready ? 'visible' : 'hidden', cursor: cursorStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg className="curved-loop-svg" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <text ref={measureRef} xmlSpace="preserve" className={className} style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          {text}
        </text>
        <defs>
          <path ref={pathRef} id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {ready && (
          <text fontWeight="bold" xmlSpace="preserve" className={className}>
            <textPath ref={textPathRef} href={`#${pathId}`} startOffset={`${-spacing}px`} xmlSpace="preserve">
              {totalText}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
};

export default CurvedLoop;
