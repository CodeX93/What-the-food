import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const WidgetPlansClient = dynamic(
  () => import("@/components/WidgetPlans/WidgetPlansClient").then((mod) => mod.WidgetPlansClient),
  { ssr: false }
);

const WidgetPlans = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <WidgetPlansClient />
      <Footer />
    </div>
  );
};

export default WidgetPlans;

