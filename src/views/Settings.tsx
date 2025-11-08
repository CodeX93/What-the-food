import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const SettingsClient = dynamic(
  () => import("@/components/Settings/SettingsClient").then((mod) => mod.SettingsClient),
  { ssr: false }
);

const Settings = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <SettingsClient />
      <Footer />
    </div>
  );
};

export default Settings;

