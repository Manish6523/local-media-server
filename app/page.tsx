"use client";

import HomeContent from "@/components/HomeContent";
import { Suspense } from "react";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="w-full h-[85vh] skeleton" />
      <div className="px-4 md:px-8 lg:px-12 py-8 space-y-8">
        {[1, 2].map((i) => (
          <div key={i}>
            <div className="h-6 w-32 skeleton rounded mb-4" />
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="w-[200px] aspect-[2/3] skeleton rounded-md flex-shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
