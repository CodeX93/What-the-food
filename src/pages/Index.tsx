import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Hero from "@/components/Home/Hero";
import Features from "@/components/Home/Features";
import HowItWorks from "@/components/Home/HowItWorks";
import Reviews from "@/components/Home/Reviews";
import PricingTable from "@/components/Home/PricingTable";
import FAQ from "@/components/Home/FAQ";
import BlogPreview from "@/components/Home/BlogPreview";
import Footer from "@/components/Layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark:bg-[#000000] transition-colors duration-300">
      <TopBar />
      <Header />
      <main className="scroll-snap-proximity overflow-y-auto overflow-x-hidden" style={{ height: 'calc(100vh - 6rem)' }}>
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
