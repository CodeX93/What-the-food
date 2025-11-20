import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const ScanHistoriesClient = dynamic(
  () => import("@/components/ScanHistories/ScanHistoriesClient").then((mod) => mod.ScanHistoriesClient),
  { ssr: false }
);

type ScanHistoriesProps = {
  initialSubscription?: any;
};

const ScanHistories = ({ initialSubscription }: ScanHistoriesProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <ScanHistoriesClient initialSubscription={initialSubscription} />
      <Footer />
    </div>
  );
};

export default ScanHistories;


