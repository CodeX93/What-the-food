import PricingTable from "@/components/Home/PricingTable";
import FAQ from "@/components/Home/FAQ";

export default function PricingPage() {
  return (
    <div className="scroll-snap-proximity overflow-y-auto overflow-x-hidden">
      <PricingTable />
      <FAQ />
    </div>
  );
}