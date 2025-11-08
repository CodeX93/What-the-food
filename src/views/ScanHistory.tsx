import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const ScanHistoryClient = dynamic(
  () => import("@/components/ScanHistory/ScanHistoryClient").then((mod) => mod.ScanHistoryClient),
  { ssr: false }
);

const ScanHistory = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <ScanHistoryClient />
      <Footer />
    </div>
  );
};

export default ScanHistory;

