import PricingTable from "@/components/Home/PricingTable";
import FAQ from "@/components/Home/FAQ";

export default function PricingPage() {
  return (
    <div className="scroll-snap-proximity overflow-x-hidden">
      <section className="min-h-screen flex items-center justify-center snap-start">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <PricingTable />
        </div>
      </section>
      <section className="min-h-screen flex items-center justify-center bg-muted/30 snap-start">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <FAQ />
        </div>
      </section>
    </div>
  );
}