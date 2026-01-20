import PricingTable from "@/components/Home/PricingTable";
import FAQ from "@/components/Pricing/FAQ";

export default function PricingPage() {
  return (
    <div className="overflow-x-hidden bg-background">
      <PricingTable />
      <FAQ />
    </div>
  );
}