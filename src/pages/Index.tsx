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
    <div className="min-h-screen">
      <TopBar />
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Reviews />
        <PricingTable />
        <FAQ />
        <BlogPreview />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
