// Shared button micro-interaction preset.
// A: a tactile, springy press — spread onto any framer-motion button for a
// consistent feel across the site's primary CTAs.
//   <motion.button {...pressFx} className="fx-btn ...">
// Pair with the `fx-btn` class (shine sweep) and an inner `btn-ico` span
// (icon bounce) from index.css for the full effect.
export const pressFx = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.9 },
  transition: { type: 'spring', stiffness: 600, damping: 12 },
};
