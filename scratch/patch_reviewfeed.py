import re

with open('src/components/ReviewFeed.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add ReviewListRow import
c = c.replace(
    "import ReviewCard, { ReviewCardSkeleton } from './ReviewCard';",
    "import ReviewCard, { ReviewCardSkeleton } from './ReviewCard';\nimport ReviewListRow from './ReviewListRow';"
)

# Update Props
c = c.replace(
    'export default function ReviewFeed({ sort, genre, searchQuery, searchMode }) {',
    'export default function ReviewFeed({ sort, genre, searchQuery, searchMode, viewMode = "grid" }) {'
)

# Replace the render block
match = re.search(r'return \(\s*<>\s*<div className="grid.*?</>\s*\);', c, flags=re.DOTALL)
if match:
    new_render = '''  // Global Hover State for List View Reveal
  const [hoveredImage, setHoveredImage] = useState(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 300 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (!hoveredImage) return;
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredImage, mouseX, mouseY]);

  return (
    <>
      <motion.div 
        layout 
        className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" 
          : "flex flex-col gap-0"}
      >
        {reviews.map((review, i) => (
          viewMode === 'grid' ? (
            <ReviewCard key={review.id} review={review} index={i % LIMIT} />
          ) : (
            <ReviewListRow 
              key={review.id} 
              review={review} 
              index={i % LIMIT} 
              onHover={setHoveredImage} 
              onLeave={() => setHoveredImage(null)} 
            />
          )
        ))}
        {loading &&
          [...Array(3)].map((_, i) => (
            viewMode === 'grid' 
              ? <ReviewCardSkeleton key={`skel-${i}`} />
              : <div key={`skel-list-${i}`} className="w-full h-16 bg-neutral-900 animate-pulse border-b border-border-subtle" />
          ))
        }
      </motion.div>

      {/* Sentinel for infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-20" />}

      {/* Global Hover Portal */}
      <AnimatePresence>
        {hoveredImage && viewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            style={{ x: springX, y: springY }}
            className="fixed top-0 left-0 pointer-events-none z-[999] ml-4 mt-4"
          >
            <img 
              src={hoveredImage} 
              alt="Hover preview" 
              className="w-48 h-72 object-cover rounded-xl shadow-2xl border border-white/10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );'''
    c = c[:match.start()] + new_render + c[match.end():]
else:
    print("Match failed!")

# Add useMotionValue, useSpring to framer-motion imports
c = c.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';")

with open('src/components/ReviewFeed.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
