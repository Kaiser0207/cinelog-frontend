import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useNavigate, useLocation } from 'react-router';
import { useLanguage } from './LanguageContext';
import { useAdmin } from './AdminAuth';
import { setMenuElementsVisible } from '../utils/menuMotion';
import './StaggeredMenu.css';

/**
 * Nav — replaces the old BottomNav. Rendered on every page.
 *
 * Toggle: the CardNav "=" → "✕" hamburger (two lines that cross).
 * Expansion: the StaggeredMenu treatment — coloured pre-layers sweep in one after
 * another, the panel lands on top, then the items rise in with a stagger and their
 * index numbers fade up.
 *
 * Destinations are ROUTES, not modals. That's deliberate: when 統計/推薦箱 were
 * overlays, "首頁" only scrolled to the top and left them (and their body-scroll
 * lock) sitting on screen — so you could never actually get back. Navigating
 * unmounts whatever you were in.
 */
export default function StaggeredMenu({
  onHomeClick,
  onSearchClick,
  onAddReview,
  searchOpen = false,
}) {
  const { t } = useLanguage();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  const toggleRef = useRef(null);
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const busyRef = useRef(false);
  const openRef = useRef(false);

  const isHome = location.pathname === '/';

  // Already home → let the page reset itself (it also dismisses the search
  // overlay, which is what made 首頁 feel dead before). Elsewhere → route home.
  const goHome = () => {
    if (!isHome) navigate('/');
    else if (onHomeClick) onHomeClick();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Search is an overlay that only the home feed owns. From another page, go
  // home and ask it to open the overlay on arrival.
  const goSearch = () => {
    if (isHome && onSearchClick) onSearchClick();
    else navigate('/', { state: { openSearch: true } });
  };

  const goAddReview = () => {
    if (isHome && onAddReview) onAddReview();
    else navigate('/', { state: { openEditor: true } });
  };

  const items = [
    { key: 'home', label: t('navHome') || '首頁', action: goHome },
    { key: 'search', label: t('navSearch') || '搜尋', action: goSearch },
    { key: 'stats', label: t('statistics') || '觀影統計', action: () => navigate('/stats') },
    {
      key: 'suggest',
      label: isAdmin ? t('navInbox') || '收件匣' : t('navSuggest') || '推薦箱',
      action: () => navigate('/suggestions'),
    },
  ];

  if (isAdmin) {
    items.push({ key: 'add', label: t('addReview'), action: goAddReview });
  }
  // Where you actually ARE — not just the URL. Search is an overlay on top of
  // the feed, so the path is still "/" while you're searching; keying off the
  // path alone would light up 首頁 instead of 搜尋.
  const activeKey =
    searchOpen ? 'search'
      : location.pathname === '/stats' ? 'stats'
        : location.pathname === '/suggestions' ? 'suggest'
          : isHome ? 'home' : null;

  const layerEls = () => {
    const pre = preLayersRef.current;
    return pre ? Array.from(pre.querySelectorAll('.sm-prelayer')) : [];
  };

  // Park the panel + layers off-screen to the left.
  useLayoutEffect(() => {
    let context;
    try {
      context = gsap.context(() => {
        const panel = panelRef.current;
        if (!panel) return;
        gsap.set([panel, ...layerEls()], { xPercent: -100 });
      });
    } catch (error) {
      console.error('Failed to initialize menu animation:', error);
      setMenuElementsVisible(panelRef.current, layerEls(), false);
    }
    return () => context?.revert();
  }, []);

  const focusFirstItem = useCallback(() => {
    panelRef.current?.querySelector('.sm-item')?.focus();
  }, []);

  const buildOpen = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return null;
    const layers = layerEls();

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();

    const labels = Array.from(panel.querySelectorAll('.sm-item-label'));
    const nums = Array.from(panel.querySelectorAll('.sm-item'));

    gsap.set(labels, { yPercent: 140, rotate: 8 });
    gsap.set(nums, { '--sm-num-opacity': 0 });

    const tl = gsap.timeline({ paused: true });

    // Pre-layers sweep in one after another…
    layers.forEach((el, i) => {
      tl.fromTo(el, { xPercent: -100 }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });

    // …then the panel lands on top of them.
    const panelAt = layers.length ? (layers.length - 1) * 0.07 + 0.08 : 0;
    tl.fromTo(panel, { xPercent: -100 }, { xPercent: 0, duration: 0.65, ease: 'power4.out' }, panelAt);

    // …then the items rise + un-rotate, staggered, with their numbers fading up.
    tl.to(
      labels,
      { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1 } },
      panelAt + 0.1
    );
    tl.to(
      nums,
      { '--sm-num-opacity': 1, duration: 0.6, ease: 'power2.out', stagger: { each: 0.08 } },
      panelAt + 0.2
    );

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (!openRef.current) {
        busyRef.current = false;
        return;
      }

      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setMenuElementsVisible(panelRef.current, layerEls(), true);
        busyRef.current = false;
        focusFirstItem();
        return;
      }

      const tl = buildOpen();
      if (!tl) {
        busyRef.current = false;
        return;
      }
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
        focusFirstItem();
      });
      tl.play(0);
    } catch (error) {
      console.error('Failed to open menu animation:', error);
      setMenuElementsVisible(panelRef.current, layerEls(), true);
      busyRef.current = false;
      focusFirstItem();
    }
  }, [buildOpen, focusFirstItem]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    const panel = panelRef.current;
    if (!panel) return;
    closeTweenRef.current?.kill();
    try {
      closeTweenRef.current = gsap.to([...layerEls(), panel], {
        xPercent: -100,
        duration: 0.32,
        ease: 'power3.in',
        overwrite: 'auto',
        onComplete: () => {
          busyRef.current = false;
        },
      });
    } catch (error) {
      console.error('Failed to close menu animation:', error);
      setMenuElementsVisible(panel, layerEls(), false);
      busyRef.current = false;
    }
  }, []);

  const toggle = useCallback(() => {
    const next = !openRef.current;
    openRef.current = next;
    setOpen(next);
    if (next) playOpen();
    else playClose();
  }, [playOpen, playClose]);

  const pick = (action) => {
    openRef.current = false;
    setOpen(false);
    playClose();
    action?.();
  };

  // Hidden panels must leave the keyboard order. While open, Escape closes the
  // dialog and Tab is contained within the menu; focus returns to the trigger.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.inert = !open;
    if (!open || !panel) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        openRef.current = false;
        setOpen(false);
        playClose();
        requestAnimationFrame(() => toggleRef.current?.focus());
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.querySelectorAll('button:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, playClose]);

  useEffect(() => () => {
    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
  }, []);

  // Lock page scroll while the menu is open.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* = → ✕ */}
      <button
        ref={toggleRef}
        type="button"
        className={`sm-toggle ${open ? 'open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="cinerooms-main-menu"
        onClick={toggle}
      >
        <span className="sm-line" />
        <span className="sm-line" />
      </button>

      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        <div className="sm-prelayer" style={{ background: '#D480C0' }} />
        <div className="sm-prelayer" style={{ background: '#FE494A' }} />
      </div>

      <aside
        id="cinerooms-main-menu"
        ref={panelRef}
        className="sm-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('mainMenu') || 'Main menu'}
        aria-hidden={!open}
      >
        <ul className="sm-list">
          {items.map((it, idx) => (
            <li key={it.key} className="sm-itemWrap">
              <button
                type="button"
                className={`sm-item ${it.key === activeKey ? 'is-active' : ''}`}
                data-index={String(idx + 1).padStart(2, '0')}
                onClick={() => pick(it.action)}
              >
                <span className="sm-item-label">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="sm-foot">CINEROOMS</div>
      </aside>
    </>
  );
}
