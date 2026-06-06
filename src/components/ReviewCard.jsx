import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useMotionTemplate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, computeEntertainment, computeCinematic, computeTotal, getScoreColor } from '../utils/constants';
import { useLanguage } from './LanguageContext';

export default function ReviewCard({ review, index = 0, gyroPermission = false }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0);
  const total = computeTotal(entertainment, cinematic);

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for mobile gyroscope fluidity
  const smoothX = useSpring(x, { damping: 20, stiffness: 100 });
  const smoothY = useSpring(y, { damping: 20, stiffness: 100 });

  const rotateX = useTransform(smoothY, [-200, 200], [15, -15]);
  const rotateY = useTransform(smoothX, [-200, 200], [-15, 15]);

  // Cinema Projector Beam (Aggressive Gyroscope Mapping)
  const beamX = useTransform(smoothX, [-200, 200], [-50, 150]);
  const beamY = useTransform(smoothY, [-200, 200], [-50, 150]);
  const backgroundPosition = useMotionTemplate`${beamX}% ${beamY}%`;

  useEffect(() => {
    if (!gyroPermission) return;
    // Throttle to ~30fps — deviceorientation fires 60+/s and drains battery.
    let lastUpdate = 0;
    const handleOrientation = (e) => {
      const now = e.timeStamp || performance.now();
      if (now - lastUpdate < 33) return;
      lastUpdate = now;
      // Clamp angles to prevent flipping
      const gamma = Math.max(-30, Math.min(30, e.gamma || 0));
      const beta = Math.max(-30, Math.min(30, e.beta || 0));
      x.set(gamma * 6.6); // map [-30, 30] to roughly [-200, 200]
      y.set((beta - 30) * 6.6); // Assume neutral holding angle is ~30 degrees beta
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroPermission, x, y]);

  const handleMouseMove = (e) => {
    if (gyroPermission) return; // Don't track mouse if gyro is active
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    if (gyroPermission) return;
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const backdropUrl = review.custom_backdrop_url
    ? review.custom_backdrop_url
    : review.backdrop_path
      ? `${TMDB_IMG_BASE}w780${review.backdrop_path}`
      : review.poster_path
        ? `${TMDB_IMG_BASE}w500${review.poster_path}`
        : null;

  const genres = review.genres
    ? (typeof review.genres === 'string' ? JSON.parse(review.genres) : review.genres)
    : [];

  const teaser = review.review_text
    ? review.review_text.replace(/[#*_~`>]/g, '').slice(0, 120) + (review.review_text.length > 120 ? '...' : '')
    : '';

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        opacity: { duration: 0.6, delay: (index % 12) * 0.05, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.6, delay: (index % 12) * 0.05, ease: [0.22, 1, 0.36, 1] }
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/review/${review.id}`)}
      whileHover={gyroPermission ? {} : { y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
      whileTap={!gyroPermission && window.innerWidth <= 768 ? { scale: 0.97, rotateX: 2, rotateY: 2 } : { scale: 0.95, filter: "brightness(0.9)" }}
      className="group relative flex flex-col glass rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 shadow-lg hover:shadow-[#FE494A]/20 hover:shadow-2xl max-w-full transform-gpu"
      style={{ 
        aspectRatio: '16/10', 
        rotateX, 
        rotateY, 
        transformPerspective: 1000 
      }}
    >
      {/* Background Image */}
      {backdropUrl ? (
        <img
          src={backdropUrl}
          alt={review.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-bg-card to-bg-elevated" />
      )}

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

      {/* Cinematic Projector Beam Layer — gentle & static (no harsh flicker) */}
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-40 transition-opacity"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,250,240,0.6) 0%, rgba(255,245,225,0.3) 15%, rgba(255,255,255,0) 50%)',
          backgroundPosition: backgroundPosition,
          backgroundSize: '250% 250%',
        }}
      />

      {/* Floating dust drifting through the projector beam (mobile + desktop) */}
      {(gyroPermission || isHovered) && (
        <>
          <motion.div
            className="block absolute inset-0 z-10 pointer-events-none overflow-hidden"
            style={{
              WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 15%, rgba(0,0,0,0) 50%)',
              WebkitMaskPosition: backgroundPosition,
              WebkitMaskSize: '250% 250%',
              maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 15%, rgba(0,0,0,0) 50%)',
              maskPosition: backgroundPosition,
              maskSize: '250% 250%',
            }}
          >
            {/* Far layer: large, sparse, slow (depth) */}
            <div
              className="absolute -inset-[50%] opacity-50 mix-blend-screen animate-dust-a"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Ccircle cx='30' cy='40' r='2' fill='%23fff' opacity='0.5'/%3E%3Ccircle cx='112' cy='92' r='2.4' fill='%23fff' opacity='0.45'/%3E%3Ccircle cx='74' cy='128' r='1.8' fill='%23fff' opacity='0.55'/%3E%3Ccircle cx='132' cy='22' r='1.6' fill='%23fff' opacity='0.4'/%3E%3Ccircle cx='18' cy='108' r='2.2' fill='%23fff' opacity='0.5'/%3E%3C/svg%3E\")",
                backgroundSize: '150px 150px'
              }}
            />
            {/* Near layer: small, dense, faster, crisp specks */}
            <div
              className="absolute -inset-[50%] opacity-70 mix-blend-screen animate-dust-b"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Ccircle cx='15' cy='25' r='0.8' fill='%23fff' opacity='0.8'/%3E%3Ccircle cx='60' cy='110' r='1' fill='%23fff' opacity='0.6'/%3E%3Ccircle cx='120' cy='40' r='0.6' fill='%23fff' opacity='0.7'/%3E%3Ccircle cx='30' cy='130' r='0.9' fill='%23fff' opacity='0.7'/%3E%3Ccircle cx='140' cy='90' r='0.5' fill='%23fff' opacity='0.5'/%3E%3Ccircle cx='85' cy='65' r='0.9' fill='%23fff' opacity='0.75'/%3E%3Ccircle cx='125' cy='125' r='0.7' fill='%23fff' opacity='0.6'/%3E%3Ccircle cx='25' cy='75' r='0.5' fill='%23fff' opacity='0.5'/%3E%3Ccircle cx='70' cy='10' r='0.9' fill='%23fff' opacity='0.7'/%3E%3Ccircle cx='95' cy='140' r='0.7' fill='%23fff' opacity='0.65'/%3E%3Ccircle cx='50' cy='55' r='0.5' fill='%23fff' opacity='0.55'/%3E%3Ccircle cx='105' cy='80' r='0.6' fill='%23fff' opacity='0.6'/%3E%3C/svg%3E\")",
                backgroundSize: '150px 150px'
              }}
            />
          </motion.div>
        </>
      )}

      {/* Legibility scrim — keeps the title readable over bright backdrops,
          and sits above the white projector glow so it can't wash out the text */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 z-[15] pointer-events-none bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
        {/* Top: Score Badge - Floating with some space */}
        <div className="absolute top-3 right-3 z-20">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10 shrink-0 shadow-lg"
            style={{
              background: `rgba(0, 0, 0, 0.65)`,
            }}
          >
            <span
              className="text-xl font-black tracking-tighter text-[#FE494A]"
            >
              {total.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Bottom: Text Content */}
        <div className="relative z-20 flex flex-col justify-end mt-auto overflow-hidden">
          {/* Genre Pills */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 pr-14">
              {genres.slice(0, 3).map((genre, i) => {
                const genreName = typeof genre === 'string' ? genre : genre.name;
                return (
                  <span
                    key={i}
                    className="text-[10px] uppercase tracking-wider font-bold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-md"
                  >
                    {genreName}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title */}
          <h3 className="text-xl md:text-2xl font-bold font-syne tracking-tighter text-white leading-tight mb-1 truncate">
            {review.title}
          </h3>

          {/* Release Year + Runtime */}
          {(review.release_date || review.runtime) && (
            <p className="text-xs font-semibold text-white/90 mb-2 flex items-center gap-1.5">
              {review.release_date && (
                <span>{new Date(review.release_date).getFullYear()}</span>
              )}
              {review.release_date && review.runtime && (
                <span className="text-white/50">·</span>
              )}
              {review.runtime && (
                <span>{review.runtime} min</span>
              )}
            </p>
          )}

          {/* Teaser */}
          {teaser && (
            <p className="text-sm text-white/60 line-clamp-2 mb-3 leading-relaxed">
              {teaser}
            </p>
          )}

          {/* CTA */}
          <div className="flex items-center gap-2 text-[#FE494A] text-xs font-bold uppercase tracking-wider group-hover:gap-3 transition-all duration-300">
            <span>{t('readReview')}</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border-subtle"
      style={{ aspectRatio: '16/10' }}
    >
      <div className="skeleton absolute inset-0" />
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="skeleton h-4 w-24 mb-3 rounded" />
        <div className="skeleton h-7 w-3/4 mb-2 rounded" />
        <div className="skeleton h-3 w-full mb-1 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}
