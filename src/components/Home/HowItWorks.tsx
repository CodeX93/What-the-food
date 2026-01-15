"use client";

import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorks = () => {
  const { t } = useLanguage();

  // YouTube video URL - can be changed later
  const youtubeUrl = "https://youtu.be/ZK-rNEhJIDs?si=-O_rsYGPsitOh5DZ";

  // Extract video ID from YouTube URL
  const getVideoId = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      return url.split("watch?v=")[1]?.split("&")[0] || "";
    } else if (url.includes("youtu.be/")) {
      return url.split("youtu.be/")[1]?.split("?")[0] || "";
    } else if (url.includes("youtube.com/embed/")) {
      return url.split("embed/")[1]?.split("?")[0] || "";
    }
    return "";
  };

  const videoId = getVideoId(youtubeUrl);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : "";

  return (
    <section
      id="how-it-works"
      className="relative w-full bg-white dark:bg-[#000000] transition-colors duration-300 py-16 sm:py-20 lg:py-24 pb-4 sm:pb-8 lg:pb-12"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-2xl md:max-w-5xl mx-auto mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 md:whitespace-nowrap">
            {(() => {
              const title = t("howitworks.title");
              // Split on "Calorie Cal" to make it green
              const calorieCalMatch = title.match(/(Calorie Cal)/i);
              if (calorieCalMatch) {
                const parts = title.split(/(Calorie Cal)/i);
                return (
                  <>
                    {parts.map((part, index) => {
                      if (part.match(/(Calorie Cal)/i)) {
                        return <span key={index} className="text-primary whitespace-normal md:whitespace-nowrap">{part}</span>;
                      }
                      return <span key={index} className="text-black dark:text-white whitespace-normal md:whitespace-nowrap">{part}</span>;
                    })}
                  </>
                );
              }
              // Fallback: Split on "works" or "Works" (case insensitive)
              const parts = title.split(/(\s+works|\s+Works)/i);
              if (parts.length > 1) {
                return (
                  <>
                    <span className="text-black dark:text-white whitespace-normal md:whitespace-nowrap">{parts[0]}</span>
                    <span className="text-primary whitespace-normal md:whitespace-nowrap"> {parts[1]?.trim()}</span>
                    {parts[2] && <span className="text-black dark:text-white whitespace-normal md:whitespace-nowrap">{parts[2]}</span>}
                  </>
                );
              }
              return <span className="text-black dark:text-white">{title}</span>;
            })()}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            {t("howitworks.subtitle")}
          </p>
        </div>

        {embedUrl && (
          <div className="max-w-4xl mx-auto">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="How What The Food Works"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HowItWorks;