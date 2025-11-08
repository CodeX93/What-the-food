import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const WidgetAdminClient = dynamic(
  () => import("@/components/WidgetAdmin/WidgetAdminClient").then((mod) => mod.WidgetAdminClient),
  { ssr: false }
);

const WidgetAdmin = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <WidgetAdminClient />
      <Footer />
    </div>
  );
};

export default WidgetAdmin;

