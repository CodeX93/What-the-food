import { SharedFoodResults } from "@/components/SharedFoodResults/SharedFoodResults";
import type { FoodAnalysis } from "@/utils/foodScan";

type SharedFoodResultsProps = {
  scanId: string;
  imageUrl: string | null;
  analysis: FoodAnalysis;
  serving: number;
  createdAt: string;
};

const SharedFoodResultsPage = ({ scanId, imageUrl, analysis, serving, createdAt }: SharedFoodResultsProps) => {
  return (
    <SharedFoodResults
      scanId={scanId}
      imageUrl={imageUrl}
      analysis={analysis}
      serving={serving}
      createdAt={createdAt}
    />
  );
};

export default SharedFoodResultsPage;

