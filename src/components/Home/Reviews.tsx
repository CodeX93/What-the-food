const Reviews = () => {
  return (
    <section className="min-h-screen flex items-center overflow-y-auto relative snap-start snap-proximity bg-[#FFF9E6] dark:bg-[#1C1C1C] transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 w-full relative z-10 py-8 sm:py-0">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Loved by Thousands</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            See what our users are saying about WhatTheFood
          </p>
        </div>

        <div 
          className="senja-embed" 
          data-id="d57c0a6b-f3c8-42a8-ac49-ab0ad78ca7a1" 
          data-mode="shadow" 
          data-lazyload="false"
        />
      </div>
    </section>
  );
};

export default Reviews;