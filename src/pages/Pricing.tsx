import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import PricingTable from "@/components/Home/PricingTable";
import FAQ from "@/components/Home/FAQ";

const Pricing = () => {
  return (
    <div className="min-h-screen">
      <TopBar />
      <Header />
      <main>
        <PricingTable />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;