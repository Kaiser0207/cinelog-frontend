import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDialogA11y } from '../utils/dialogA11y';
import {
  HOME_GENRE_OPTIONS,
  HOME_MEDIA_OPTIONS,
  selectedFilterLabel,
} from '../utils/homeFilters';
import { useLanguage } from './LanguageContext';

function Chevron({ open }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function MobileFilterControls({
  genre,
  media,
  disabled = false,
  onGenreChange,
  onMediaChange,
}) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState(null);
  const dialogRef = useRef(null);
  const selectedRef = useRef(null);
  const open = activeFilter !== null;
  const isMedia = activeFilter === 'media';
  const options = isMedia ? HOME_MEDIA_OPTIONS : HOME_GENRE_OPTIONS;
  const value = isMedia ? media : genre;
  const title = isMedia ? t('mediaFilterShort') : t('genreFilterShort');
  const titleId = activeFilter ? `mobile-${activeFilter}-filter-title` : undefined;

  const close = () => setActiveFilter(null);

  useDialogA11y({
    open,
    containerRef: dialogRef,
    initialFocusRef: selectedRef,
    onClose: close,
  });

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const choose = (nextValue) => {
    if (isMedia) onMediaChange(nextValue);
    else onGenreChange(nextValue);
    close();
  };

  const summaryButton = (kind, label, selectedValue) => {
    const isOpen = activeFilter === kind;
    return (
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setActiveFilter(kind)}
        className="flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-full border border-border-subtle bg-[#E8E2D2] px-4 text-left text-sm font-black text-[#1A1A1A] shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className="min-w-0 truncate">
          {label}
          <span aria-hidden="true" className="mx-1 text-[#1A1A1A]/35">·</span>
          {selectedValue}
        </span>
        <Chevron open={isOpen} />
      </button>
    );
  };

  return (
    <>
      <div
        className="relative z-20 grid grid-cols-2 gap-3 px-5 pb-7 md:hidden"
        aria-describedby={disabled ? 'search-filter-note' : undefined}
      >
        {summaryButton(
          'media',
          t('mediaFilterShort'),
          selectedFilterLabel(HOME_MEDIA_OPTIONS, media, t, true),
        )}
        {summaryButton(
          'genre',
          t('genreFilterShort'),
          selectedFilterLabel(HOME_GENRE_OPTIONS, genre, t, true),
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[900] flex items-end bg-[#1A1A1A]/45 md:hidden"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <motion.div
              ref={dialogRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="max-h-[78svh] w-full overflow-y-auto rounded-t-[2rem] border-t border-[#1A1A1A]/10 bg-[#F5EFE1] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 id={titleId} className="text-xl font-black text-[#1A1A1A]">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t('closeFilter')}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E8E2D2] text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div role="radiogroup" aria-labelledby={titleId} className="space-y-2">
                {options.map((option) => {
                  const selected = option.value === value;
                  return (
                    <button
                      key={option.value || 'all'}
                      ref={selected ? selectedRef : null}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => choose(option.value)}
                      className={`flex min-h-12 w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-base font-bold transition-colors ${
                        selected
                          ? 'bg-[#FE494A] text-[#1A1A1A]'
                          : 'bg-[#E8E2D2] text-[#1A1A1A]/75'
                      }`}
                    >
                      <span>{t(option.labelKey)}</span>
                      <span aria-hidden="true" className="text-lg">
                        {selected ? '●' : '○'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
