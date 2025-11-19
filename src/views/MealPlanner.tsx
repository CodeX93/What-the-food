import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const MealPlannerClient = dynamic(
  () => import("@/components/MealPlanner/MealPlannerClient").then((mod) => mod.MealPlannerClient),
  { ssr: false }
);

const MealPlanner = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <MealPlannerClient />
      <Footer />
    </div>
  );
};

export default MealPlanner;

