import TopBar from "@/components/Layout/TopBar";
import { HeaderServer } from "@/components/Layout/HeaderServer";
import Footer from "@/components/Layout/Footer";
import Hero from "@/components/Home/Hero";
import Features from "@/components/Home/Features";
import HowItWorks from "@/components/Home/HowItWorks";
import Reviews from "@/components/Home/Reviews";
import PricingTable from "@/components/Home/PricingTable";
import FAQ from "@/components/Home/FAQ";
import BlogPreview from "@/components/Home/BlogPreview";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark:bg-[#000000] transition-colors duration-300 overflow-x-hidden">
      <TopBar />
      <HeaderServer />
      <main className="scroll-snap-proximity">
        <Hero />
        <Features />
        <HowItWorks />
        <Reviews />
        <PricingTable />
        <FAQ />
        <BlogPreview />
        <Footer />
      </main>
    </div>
  );
};

export default Index;
