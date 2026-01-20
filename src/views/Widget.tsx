import dynamic from "next/dynamic";
import FAQ from "@/components/Widget/FAQ";

const WidgetLanding = dynamic(() => import("@/components/Widget/WidgetLanding").then((mod) => mod.WidgetLanding), {
  ssr: false,
});

export default function WidgetPage() {
  return (
    <>
      <WidgetLanding />
      <FAQ />
    </>
  );
}