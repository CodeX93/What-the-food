import dynamic from "next/dynamic";

const WidgetLanding = dynamic(() => import("@/components/Widget/WidgetLanding").then((mod) => mod.WidgetLanding), {
  ssr: false,
});

export default function WidgetPage() {
  return <WidgetLanding />;
}