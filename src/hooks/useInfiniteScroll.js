import { useRef, useCallback } from 'react';

export function useInfiniteScroll(callback, loading) {
  const observer = useRef(null);

  const sentinelRef = useCallback(
    (node) => {
      if (loading) return;

      if (observer.current) {
        observer.current.disconnect();
      }

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            callback();
          }
        },
        { threshold: 0.1 }
      );

      if (node) {
        observer.current.observe(node);
      }
    },
    [callback, loading]
  );

  return sentinelRef;
}
