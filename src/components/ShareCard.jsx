import { useRef, useCallback } from 'react';
import { FONT_MAP, computeEntertainment, computeCinematic, computeTotal, TMDB_IMG_BASE } from '../utils/constants';

export default function ShareCard({ review, className }) {
  const cardRef = useRef(null);

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0);
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
            aspectRatio: '4/5',
            borderRadius: '40px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '60px',
            boxSizing: 'border-box',
            fontFamily: "'Inter', sans-serif",
            color: '#ffffff',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            backgroundColor: '#1a1a1a',
          }}
        >
          {/* Background Image */}
          {(backdropUrl || posterUrl) && (
            <img 
              src={backdropUrl || posterUrl} 
              crossOrigin="anonymous"
              alt="Backdrop"
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0
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
                alignItems: 'center', 
                gap: '20px',
                marginBottom: '20px' 
              }}>
                 <div style={{
                   background: 'rgba(0,0,0,0.6)',
                   backdropFilter: 'blur(10px)',
                   padding: '20px 30px',
                   borderRadius: '20px',
                   fontSize: '70px',
                   fontWeight: 900,
                   color: getScoreColor(total),
                   fontFamily: "'Outfit', sans-serif",
                   border: '2px solid rgba(255,255,255,0.1)'
                 }}>
                   {total.toFixed(1)}
                 </div>
                 <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>
                   CineRooms Score
                 </div>
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: '85px',
                fontWeight: 900,
                margin: '0 0 20px 0',
                lineHeight: 1.1,
                fontFamily: cleanFontFamily,
                textShadow: '0 4px 20px rgba(0,0,0,0.8)'
              }}>
                {review.title}
              </h1>

              {/* Genres */}
              {genres.length > 0 && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '40px' }}>
                   {genres.slice(0, 3).map((g, i) => (
                      <span key={i} style={{
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(5px)',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {typeof g === 'string' ? g : g.name}
                      </span>
                   ))}
                </div>
              )}

              {/* Short text snippet (Teaser) */}
              {review.review_text && (
                <p style={{
                  fontSize: '34px',
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: '0 0 50px 0',
                  fontFamily: cleanFontFamily,
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}>
                  {review.review_text.replace(/[#*_~`>]/g, '').slice(0, 150)}...
                </p>
              )}

              {/* Call to action & Watermark */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '30px',
                borderTop: '2px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '30px', color: '#CCFF00', fontWeight: 900 }}>
                  🔗 點擊連結閱讀完整影評
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: '#ffffff', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>
                  CINEROOMS
                </div>
              </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleShare}
        className={className || "group flex items-center gap-2 px-8 py-3 rounded-full bg-[#CCFF00] hover:bg-[#D4FF00] text-black font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm"}
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
