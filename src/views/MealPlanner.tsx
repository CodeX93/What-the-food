import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const MealPlannerClient = dynamic(
  () => import("@/components/MealPlanner/MealPlannerClient").then((mod) => mod.MealPlannerClient),
  { ssr: false }
);

type MealPlannerProps = {
  initialSubscription?: any;
};

const MealPlanner = ({ initialSubscription }: MealPlannerProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <MealPlannerClient initialSubscription={initialSubscription} />
      <Footer />
    </div>
  );
};

export default MealPlanner;

