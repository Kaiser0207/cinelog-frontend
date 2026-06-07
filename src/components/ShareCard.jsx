import { useRef, useCallback } from 'react';
import { FONT_MAP, computeEntertainment, computeCinematic, computeTotal, TMDB_IMG_BASE } from '../utils/constants';

export default function ShareCard({ review, className }) {
  const cardRef = useRef(null);

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0, review.story);
  const total = computeTotal(entertainment, cinematic);
  
  const getScoreColor = (score) => {
    if (score >= 9) return '#1db954'; // Green
    if (score >= 7) return '#f5c518'; // Yellow
    if (score >= 5) return '#e50914'; // Red
    return '#6b6b80'; // Gray
  };

  const fontFamily = FONT_MAP[review.review_font] || FONT_MAP['Outfit'];
  const cleanFontFamily = fontFamily.replace(/var\(--font-\w+\)/, '').replace(/['"]/g, '').trim() || 'sans-serif';

  const genres = review.genres
    ? (typeof review.genres === 'string' ? JSON.parse(review.genres) : review.genres)
    : [];

  const backdropUrl = review.custom_backdrop_url
    ? review.custom_backdrop_url
    : review.backdrop_path
      ? `${TMDB_IMG_BASE}w1280${review.backdrop_path}`
      : null;

  const posterUrl = review.poster_path
    ? `${TMDB_IMG_BASE}w780${review.poster_path}`
    : null;

  const handleShare = useCallback(async () => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `cinerooms-${review.title || 'review'}.png`, {
        type: 'image/png',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `CineRooms: ${review.title}`,
            text: `Check out my review of ${review.title}!`,
          });
        } catch {
          downloadBlob(blob, file.name);
        }
      } else {
        downloadBlob(blob, file.name);
      }
    }, 'image/png');
  }, [review]);

  return (
    <div>
      {/* Hidden render target */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <div
          ref={cardRef}
          style={{
            position: 'relative',
            width: '1080px',
            aspectRatio: '16/9',
            borderRadius: '40px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '50px 60px',
            boxSizing: 'border-box',
            fontFamily: "'Inter', sans-serif",
            color: '#ffffff',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            backgroundColor: '#1a1a1a',
          }}
        >
          {/* Background Image */}
          {(backdropUrl || posterUrl) && (
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: `url(${backdropUrl || posterUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0
              }}
            />
          )}

          {/* Gradient Overlay */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 100%)',
            zIndex: 1
          }} />

          {/* Content Container */}
          <div style={{ position: 'relative', zIndex: 2 }}>
              {/* Score */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'baseline', 
                gap: '20px',
                marginBottom: '10px' 
              }}>
                 <div style={{
                   fontSize: '110px',
                   fontWeight: 900,
                   lineHeight: 1,
                   color: '#FE494A',
                   fontFamily: "'Outfit', sans-serif",
                   textShadow: `0 0 30px #FE494A80, 0 4px 20px rgba(0,0,0,0.8)`
                 }}>
                   {total.toFixed(1)}
                 </div>
                 <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                   CineRooms Score
                 </div>
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: review.title.length > 25 ? '60px' : review.title.length > 15 ? '75px' : '85px',
                fontWeight: 900,
                margin: '0 0 15px 0',
                lineHeight: 1.1,
                fontFamily: cleanFontFamily,
                textShadow: '0 4px 20px rgba(0,0,0,0.9)'
              }}>
                {review.title}
              </h1>

              {/* Genres */}
              {genres.length > 0 && (
                <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', alignItems: 'center' }}>
                   {genres.slice(0, 3).map((g, i) => (
                      <div key={i} style={{
                        fontSize: '26px',
                        fontWeight: 'bold',
                        color: '#D480C0', // Bright cinematic color for tags
                        textTransform: 'uppercase',
                        textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                        letterSpacing: '1px'
                      }}>
                        #{typeof g === 'string' ? g : g.name}
                      </div>
                   ))}
                </div>
              )}

              {/* Short text snippet (Teaser) */}
              {review.review_text && (
                <p style={{
                  fontSize: '30px',
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: '0 0 25px 0',
                  fontFamily: cleanFontFamily,
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}>
                  {review.review_text.replace(/[#*_~`>]/g, '').slice(0, 100)}...
                </p>
              )}

              {/* Call to action & Watermark */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '20px',
                borderTop: '2px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '24px', color: '#FE494A', fontWeight: 900 }}>
                  🔗 點擊連結閱讀完整影評
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>
                  CINEROOMS
                </div>
              </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleShare}
        className={className || "group flex items-center gap-2 px-8 py-3 rounded-full bg-[#D480C0] hover:bg-[#FE494A] hover:text-white text-black font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm"}
      >
        <span className="inline-block font-black text-sm uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
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
