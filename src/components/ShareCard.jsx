import { useRef, useCallback } from 'react';
import { FONT_MAP, computeEntertainment, computeCinematic, computeTotal } from '../utils/constants';

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

  const handleShare = useCallback(async () => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null, // Transparent background
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
            width: '1000px', // Fixed width for Instagram sticker
            padding: '40px',
            boxSizing: 'border-box',
            fontFamily: "'Inter', sans-serif",
            color: '#ffffff',
            backgroundColor: 'transparent', // Explicitly transparent
          }}
        >
          {/* CINEROOMS Watermark */}
          <div 
            style={{
              textAlign: 'right',
              marginBottom: '60px',
              opacity: 0.95,
            }}
          >
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#CCFF00', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px', textTransform: 'uppercase' }}>
              CINEROOMS is my creative movie journal 🎬
            </div>
          </div>

          {/* Neo-brutalist Score & Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '50px' }}>
            <div
              style={{
                fontSize: '180px',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                color: getScoreColor(total),
                textShadow: `0 0 40px ${getScoreColor(total)}80, 0 4px 10px rgba(0,0,0,0.8)`,
                lineHeight: 1,
              }}
            >
              {total.toFixed(1)}
            </div>
            
            <div
              style={{
                fontSize: '72px',
                fontWeight: 800,
                fontFamily: cleanFontFamily || "'Outfit', sans-serif",
                color: '#ffffff',
                lineHeight: 1.1,
                textShadow: '0 4px 15px rgba(0,0,0,0.9)',
              }}
            >
              {review.title}
            </div>
          </div>

          {/* Full Review Text */}
          {review.review_text && (
            <div
              style={{
                fontSize: '42px',
                lineHeight: 1.6,
                fontFamily: cleanFontFamily,
                whiteSpace: 'pre-wrap',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
            >
              {review.review_text.replace(/[#*_~`>]/g, '')}
            </div>
          )}
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
