import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const WallOfLove = () => {
  return (
    <div className="min-h-screen">
      <TopBar />
      <Header />
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Wall of Love</h1>
            <p className="text-lg text-muted-foreground">
              See what our amazing community is saying about WhatTheFood
            </p>
          </div>

          <div 
            className="senja-embed" 
            data-id="d57c0a6b-f3c8-42a8-ac49-ab0ad78ca7a1" 
            data-mode="shadow" 
            data-lazyload="false"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WallOfLove;