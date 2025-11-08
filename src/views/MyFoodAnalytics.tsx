import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const MyFoodAnalyticsClient = dynamic(
  () => import("@/components/MyFoodAnalytics/MyFoodAnalyticsClient").then((mod) => mod.MyFoodAnalyticsClient),
  { ssr: false }
);

const MyFoodAnalytics = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <MyFoodAnalyticsClient />
      <Footer />
    </div>
  );
};

export default MyFoodAnalytics;


