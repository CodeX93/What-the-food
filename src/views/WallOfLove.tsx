import dynamic from "next/dynamic";

const WallOfLoveClient = dynamic(
  () => import("@/components/WallOfLove/WallOfLoveClient").then((mod) => mod.WallOfLoveClient),
  { ssr: false }
);

export default function WallOfLovePage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Wall of Love</h1>
          <p className="text-lg text-muted-foreground">
            See what our amazing community is saying about WhatTheFood
          </p>
        </div>

        <WallOfLoveClient />
      </div>
    </div>
  );
}