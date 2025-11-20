import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const MyFoodAnalyticsClient = dynamic(
  () => import("@/components/MyFoodAnalytics/MyFoodAnalyticsClient").then((mod) => mod.MyFoodAnalyticsClient),
  { ssr: false }
);

type MyFoodAnalyticsProps = {
  initialSubscription?: any;
};

const MyFoodAnalytics = ({ initialSubscription }: MyFoodAnalyticsProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <MyFoodAnalyticsClient initialSubscription={initialSubscription} />
      <Footer />
    </div>
  );
};

export default MyFoodAnalytics;


