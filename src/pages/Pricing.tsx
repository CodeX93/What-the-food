import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import PricingTable from "@/components/Home/PricingTable";
import FAQ from "@/components/Home/FAQ";

const Pricing = () => {
  return (
    <div>
      <TopBar />
      <Header />
      <main className="scroll-snap-proximity">
        <PricingTable />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;