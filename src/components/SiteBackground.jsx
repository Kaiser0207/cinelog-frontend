import DotField from './DotField';

/**
 * The site's backdrop — a dot grid that bulges away from the cursor.
 *
 * It sits at z-index -10, behind everything. That only works because <body> is
 * transparent (see index.html / index.css): a background on <body> paints in the
 * element-background layer, which is ABOVE negative-z-index elements, and would
 * hide this completely. <html> keeps the cream, so the page still looks right if
 * the canvas never comes up.
 */
export default function SiteBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <DotField
        dotRadius={1.6}
        dotSpacing={16}
        // Dots in the site's own ink: slate → pink, faint enough to read as texture.
        gradientFrom="rgba(59, 72, 86, 0.32)"
        gradientTo="rgba(212, 128, 192, 0.32)"
        // The glow is the PAGE colour, not a light — it dissolves the dots into
        // the background around the cursor. Cream, because the page is cream.
        glowColor="#E3DAC9"
        glowRadius={180}
        cursorRadius={420}
        bulgeStrength={55}
      />
    </div>
  );
}
