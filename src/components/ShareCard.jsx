import { useRef, useCallback } from 'react';
import { TMDB_IMG_BASE, FONT_MAP, computeEntertainment, computeCinematic, computeTotal, getScoreColor } from '../utils/constants';

export default function ShareCard({ review }) {
  const cardRef = useRef(null);

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0);
  const total = computeTotal(entertainment, cinematic);

  const genres = review.genres
    ? (typeof review.genres === 'string' ? JSON.parse(review.genres) : review.genres)
    : [];

  const teaser = review.review_text
    ? review.review_text.replace(/[#*_~`>]/g, '').slice(0, 160) + (review.review_text.length > 160 ? '...' : '')
    : '';

  const fontFamily = FONT_MAP[review.review_font] || FONT_MAP['Outfit'];
  const bgImage = review.poster_path
    ? `${TMDB_IMG_BASE}w780${review.poster_path}`
    : review.backdrop_path
      ? `${TMDB_IMG_BASE}w780${review.backdrop_path}`
      : null;

  const handleShare = useCallback(async () => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#07070d',
      logging: false,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `cinelog-${review.title || 'review'}.png`, {
        type: 'image/png',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `CineLog: ${review.title}`,
            text: `My review of ${review.title} — ${total.toFixed(1)}/10`,
          });
        } catch {
          downloadBlob(blob, file.name);
        }
      } else {
        downloadBlob(blob, file.name);
      }
    }, 'image/png');
  }, [review, total]);

  return (
    <div>
      {/* Hidden render target */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <div
          ref={cardRef}
          style={{
            width: '1080px',
            height: '1920px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#07070d',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Background Image */}
          {bgImage && (
            <img
              src={bgImage}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Dark Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.95) 100%)',
            }}
          />

          {/* Content */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '80px',
            }}
          >
            {/* Score */}
            <div
              style={{
                fontSize: '180px',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                color: getScoreColor(total),
                textShadow: `0 0 60px ${getScoreColor(total)}80`,
                lineHeight: 1,
                marginBottom: '20px',
              }}
            >
              {total.toFixed(1)}
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 800,
                fontFamily: fontFamily.replace(/var\(--font-\w+\)/, '').replace(/['"]/g, '') || "'Outfit', sans-serif",
                color: '#ffffff',
                lineHeight: 1.1,
                marginBottom: '20px',
              }}
            >
              {review.title}
            </div>

            {/* Year + Genres */}
            <div
              style={{
                fontSize: '28px',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '30px',
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
              }}
            >
              {review.release_date && (
                <span>{new Date(review.release_date).getFullYear()}</span>
              )}
              {genres.slice(0, 3).map((g, i) => (
                <span key={i}>{typeof g === 'string' ? g : g.name}</span>
              ))}
            </div>

            {/* Review Teaser */}
            {teaser && (
              <div
                style={{
                  fontSize: '32px',
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.6,
                  marginBottom: '40px',
                  maxHeight: '200px',
                  overflow: 'hidden',
                  fontFamily: fontFamily.replace(/var\(--font-\w+\)/, '').replace(/['"]/g, '') || "'Inter', sans-serif",
                }}
              >
                {teaser}
              </div>
            )}

            {/* Spotify Track */}
            {review.spotify_track_name && (
              <div
                style={{
                  fontSize: '24px',
                  color: '#1db954',
                  marginBottom: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                🎵 {review.spotify_track_name}
              </div>
            )}

            {/* Watermark */}
            <div
              style={{
                fontSize: '28px',
                color: 'rgba(255,255,255,0.25)',
                fontWeight: 600,
                letterSpacing: '4px',
                textTransform: 'uppercase',
              }}
            >
              CineLog
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleShare}
        className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#CCFF00] hover:bg-[#D4FF00] transition-all border-none shadow-sm cursor-pointer"
      >
        <span className="inline-block text-black font-bold text-sm transition-all duration-300 group-hover:scale-110 group-hover:font-black">
          📱 Share to Story
        </span>
      </button>
    </div>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
