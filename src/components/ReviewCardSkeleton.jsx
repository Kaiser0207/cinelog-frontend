import React from "react";

export default function ReviewCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
      {/* Backdrop 佔位 */}
      <div className="w-full h-48 bg-neutral-800" />

      {/* Color Strip 佔位 */}
      <div className="w-full h-3 bg-neutral-700" />

      <div className="p-4 space-y-3">
        {/* 標題 */}
        <div className="h-5 bg-neutral-700 rounded w-3/4" />
        {/* 副標題 */}
        <div className="h-4 bg-neutral-800 rounded w-1/2" />
        {/* 分類標籤 */}
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 bg-neutral-800 rounded-full" />
          <div className="h-6 w-12 bg-neutral-800 rounded-full" />
        </div>
      </div>
    </div>
  );
}
