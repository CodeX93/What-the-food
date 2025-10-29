const Reviews = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold mb-4">Loved by Thousands</h2>
          <p className="text-lg text-muted-foreground">
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