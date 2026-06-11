// Shared button micro-interaction preset.
// A: a tactile, springy press — spread onto any framer-motion button for a
// consistent feel across the site's primary CTAs.
//   <motion.button {...pressFx} className="fx-btn ...">
// Pair with the `fx-btn` class (shine sweep) and an inner `btn-ico` span
// (icon bounce) from index.css for the full effect.
// whileTap fires on pointer-DOWN, so feedback shows the moment you touch.
// A light, stiff spring reaches the squish near-instantly even on a quick tap.
// No whileHover: on touch devices a stuck hover-state would linger after tap.
export const pressFx = {
  whileTap: { scale: 0.9 },
  transition: { type: 'spring', stiffness: 700, damping: 15, mass: 0.4 },
};
