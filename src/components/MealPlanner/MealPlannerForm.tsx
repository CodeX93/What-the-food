'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { getIdealWeightRange } from "@/utils/bmi";
import { useTranslation } from "@/hooks/use-translation";

interface MealPlannerFormProps {
  profile: any;
  onGenerate: (formData: MealPlannerFormData) => Promise<void>;
  generating: boolean;
}

export interface MealPlannerFormData {
  // Step 1: Fitness Goals
  endGoal: string;
  targetWeight: number;
  timeframe: number;
  exercisePlan: string;
  exercisePreferences: string[];
  additionalInfo: string;

  // Step 2: Diet Preferences
  dietType: string;
  mealsPerDay: number;
  includeSnacks: boolean;
  planDuration: number; // in days

  // Step 3: Allergies & Restrictions
  allergies: string[];
  customRestrictions: string;
}

// Base arrays with English values (for backend processing)
const FITNESS_GOALS_VALUES = [
  "lose_weight",
  "gain_weight",
  "maintain_weight",
  "build_muscle",
  "improve_fitness",
];

const DIET_TYPES_VALUES = [
  "balanced",
  "keto",
  "intermittent_fasting",
  "high_protein",
  "high_carb",
  "low_carb",
  "mediterranean",
  "paleo",
  "vegan",
  "vegetarian",
  "gluten_free",
  "dairy_free",
  "low_fodmap",
  "pescatarian",
];

const PLAN_DURATIONS = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 21, label: "21d" },
  { value: 30, label: "30d" },
];

// English values for allergies and exercises (for backend processing)
const ALLERGIES_VALUES = [
  "Peanuts",
  "Dairy",
  "Soy",
  "Fish",
  "Tree nuts",
  "Eggs",
  "Wheat/Gluten",
  "Shellfish",
  "Sesame",
  "Sulfites",
  "Mustard",
  "Celery",
];

const EXERCISE_OPTIONS_VALUES = [
  "Cardio / Walking",
  "Running / Jogging",
  "Cycling",
  "Swimming",
  "Strength Training",
  "Bodyweight / Calisthenics",
  "HIIT / Interval Training",
  "Yoga / Pilates",
  "Dance / Zumba",
  "Sports / Team Activities",
  "Mobility / Stretching",
  "Outdoor Activities (Hiking, etc.)",
];

// Mapping functions for translation keys
const getFitnessGoalKey = (value: string) => `mealplanner.form.goal.${value}`;
const getDietTypeKey = (value: string) => `mealplanner.form.diet.${value}`;
const getAllergyKey = (value: string) => {
  const keyMap: Record<string, string> = {
    "Peanuts": "peanuts",
    "Dairy": "dairy",
    "Soy": "soy",
    "Fish": "fish",
    "Tree nuts": "tree_nuts",
    "Eggs": "eggs",
    "Wheat/Gluten": "wheat_gluten",
    "Shellfish": "shellfish",
    "Sesame": "sesame",
    "Sulfites": "sulfites",
    "Mustard": "mustard",
    "Celery": "celery",
  };
  return `mealplanner.form.allergy.${keyMap[value] || value.toLowerCase().replace(/\s+/g, "_")}`;
};
const getExerciseKey = (value: string) => {
  const keyMap: Record<string, string> = {
    "Cardio / Walking": "cardio_walking",
    "Running / Jogging": "running_jogging",
    "Cycling": "cycling",
    "Swimming": "swimming",
    "Strength Training": "strength_training",
    "Bodyweight / Calisthenics": "bodyweight_calisthenics",
    "HIIT / Interval Training": "hiit_interval_training",
    "Yoga / Pilates": "yoga_pilates",
    "Dance / Zumba": "dance_zumba",
    "Sports / Team Activities": "sports_team_activities",
    "Mobility / Stretching": "mobility_stretching",
    "Outdoor Activities (Hiking, etc.)": "outdoor_activities",
  };
  return `mealplanner.form.exercise.${keyMap[value] || value.toLowerCase().replace(/\s+/g, "_").replace(/[\/\(\)]/g, "")}`;
};

export function MealPlannerForm({ profile, onGenerate, generating }: MealPlannerFormProps) {
  const t = useTranslation();
  
  // Create translated arrays for display
  const FITNESS_GOALS = FITNESS_GOALS_VALUES.map(value => ({
    value,
    label: t(getFitnessGoalKey(value)),
  }));
  
  const DIET_TYPES = DIET_TYPES_VALUES.map(value => ({
    value,
    label: t(getDietTypeKey(value)),
  }));
  
  const ALLERGIES = ALLERGIES_VALUES.map(value => ({
    value,
    label: t(getAllergyKey(value)),
  }));
  
  const EXERCISE_OPTIONS = EXERCISE_OPTIONS_VALUES.map(value => ({
    value,
    label: t(getExerciseKey(value)),
  }));
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Fitness Goals
  const [endGoal, setEndGoal] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("");
  const [exercisePlan, setExercisePlan] = useState<string>("");
  const [exercisePreferences, setExercisePreferences] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const [additionalDetails, setAdditionalDetails] = useState<string>("");
  
  // Initialize additionalDetails from existing fields if they exist
  useEffect(() => {
    if ((exercisePlan || additionalInfo) && !additionalDetails) {
      setAdditionalDetails([exercisePlan, additionalInfo].filter(Boolean).join("\n\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Step 2: Diet Preferences
  const [dietType, setDietType] = useState<string>("");
  const [mealsPerDay, setMealsPerDay] = useState<string>("3");
  const [includeSnacks, setIncludeSnacks] = useState<boolean>(true);
  const [planDuration, setPlanDuration] = useState<number>(7);

  // Step 3: Allergies & Restrictions
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customRestrictions, setCustomRestrictions] = useState<string>("");

  const idealWeightRange = getIdealWeightRange(profile?.height_cm);

  const progress = (currentStep / totalSteps) * 100;

  const handleAllergyToggle = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const handleExerciseToggle = (exercise: string) => {
    setExercisePreferences((prev) =>
      prev.includes(exercise) ? prev.filter((item) => item !== exercise) : [...prev, exercise]
    );
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    if (!endGoal || !targetWeight || !timeframe || !dietType) {
      return;
    }

    // Use additionalDetails if provided, otherwise fall back to individual fields
    const combinedDetails = additionalDetails.trim() || (exercisePlan && additionalInfo ? `${exercisePlan}\n\n${additionalInfo}` : exercisePlan || additionalInfo || "");

    const formData: MealPlannerFormData = {
      endGoal,
      targetWeight: parseFloat(targetWeight),
      timeframe: parseInt(timeframe),
      exercisePlan: combinedDetails, // Send combined details to exercisePlan
      exercisePreferences,
      additionalInfo: combinedDetails, // Also send to additionalInfo for backend processing
      dietType,
      mealsPerDay: parseInt(mealsPerDay),
      includeSnacks,
      planDuration,
      allergies,
      customRestrictions,
    };

    await onGenerate(formData);
  };

  const canProceedStep1 = endGoal && targetWeight && timeframe; // Exercise preferences are optional
  const canProceedStep2 = dietType && mealsPerDay;
  const canGenerate = canProceedStep1 && canProceedStep2;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        
        <Progress value={progress} className="h-2 bg-muted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && t("mealplanner.form.step1.title")}
            {currentStep === 2 && t("mealplanner.form.step2.title")}
            {currentStep === 3 && t("mealplanner.form.step3.title")}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && t("mealplanner.form.step1.description")}
            {currentStep === 2 && t("mealplanner.form.step2.description")}
            {currentStep === 3 && t("mealplanner.form.step3.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Fitness Goals */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-4 block">{t("mealplanner.form.goal.title")}</Label>
                <RadioGroup value={endGoal} onValueChange={setEndGoal} className="space-y-3">
                  {FITNESS_GOALS.map((goal) => (
                    <div key={goal.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={goal.value} id={goal.value} />
                      <Label htmlFor={goal.value} className="font-normal cursor-pointer flex-1">
                        {goal.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="target-weight" className="text-base font-semibold mb-2 block">
                  {t("mealplanner.form.targetweight")}
                </Label>
                {idealWeightRange && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("mealplanner.form.targetweight.ideal")}: {idealWeightRange.min} - {idealWeightRange.max} kg
                  </p>
                )}
                <Input
                  id="target-weight"
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder={profile?.weight_kg ? `${t("mealplanner.form.targetweight.current")}: ${profile.weight_kg} kg` : t("mealplanner.form.targetweight.placeholder")}
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="timeframe" className="text-base font-semibold mb-2 block">
                  {t("mealplanner.form.timeframe")}
                </Label>
                <Input
                  id="timeframe"
                  type="number"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  placeholder={t("mealplanner.form.timeframe.placeholder")}
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label className="text-base font-semibold mb-4 block">
                  {t("mealplanner.form.exercise.title")} <span className="text-sm font-normal text-muted-foreground">({t("mealplanner.form.additional.optional")})</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("mealplanner.form.exercise.description")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXERCISE_OPTIONS.map((exercise) => (
                    <div
                      key={exercise.value}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={exercise.value}
                        checked={exercisePreferences.includes(exercise.value)}
                        onCheckedChange={() => handleExerciseToggle(exercise.value)}
                      />
                      <Label htmlFor={exercise.value} className="font-normal cursor-pointer flex-1">
                        {exercise.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Label htmlFor="additional-details" className="text-base font-semibold mb-2 block">
                    {t("mealplanner.form.additional.title")} <span className="text-sm font-normal text-muted-foreground">({t("mealplanner.form.additional.optional")})</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("mealplanner.form.additional.description")}
                  </p>
                  <Textarea
                    id="additional-details"
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                    placeholder={t("mealplanner.form.additional.placeholder")}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("mealplanner.form.additional.hint")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Diet Preferences */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-4 block">{t("mealplanner.form.diettype")}</Label>
                <RadioGroup value={dietType} onValueChange={setDietType} className="space-y-3">
                  {DIET_TYPES.map((diet) => (
                    <div key={diet.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={diet.value} id={diet.value} />
                      <Label htmlFor={diet.value} className="font-normal cursor-pointer flex-1">
                        {diet.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="meals-per-day" className="text-base font-semibold mb-2 block">
                  {t("mealplanner.form.mealsperday")}
                </Label>
                <RadioGroup value={mealsPerDay} onValueChange={setMealsPerDay} className="flex flex-wrap gap-3">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <div key={num} className="flex items-center space-x-2">
                      <RadioGroupItem value={num.toString()} id={`meals-${num}`} />
                      <Label htmlFor={`meals-${num}`} className="font-normal cursor-pointer">
                        {num}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-semibold mb-4 block">{t("mealplanner.form.includesnacks")}</Label>
                <RadioGroup
                  value={includeSnacks ? "yes" : "no"}
                  onValueChange={(value) => setIncludeSnacks(value === "yes")}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="yes" id="snacks-yes" />
                    <Label htmlFor="snacks-yes" className="font-normal cursor-pointer flex-1">
                      {t("mealplanner.form.includesnacks.yes")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="no" id="snacks-no" />
                    <Label htmlFor="snacks-no" className="font-normal cursor-pointer flex-1">
                      {t("mealplanner.form.includesnacks.no")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-semibold mb-4 block">{t("mealplanner.form.planduration")}</Label>
                <div className="flex gap-3 flex-wrap mb-4">
                  {PLAN_DURATIONS.map((duration) => (
                    <Button
                      key={duration.value}
                      type="button"
                      variant={planDuration === duration.value ? "default" : "outline"}
                      onClick={() => setPlanDuration(duration.value)}
                      className={`min-w-[60px] ${planDuration === duration.value ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {duration.label}
                    </Button>
                  ))}
                </div>
                <div>
                  <Input
                    type="number"
                    value={planDuration}
                    onChange={(e) => setPlanDuration(parseInt(e.target.value) || 7)}
                    min={1}
                    max={365}
                    className="max-w-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Allergies & Restrictions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-4 block">
                  {t("mealplanner.form.allergies")}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ALLERGIES.map((allergy) => (
                    <div key={allergy.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={allergy.value}
                        checked={allergies.includes(allergy.value)}
                        onCheckedChange={() => handleAllergyToggle(allergy.value)}
                      />
                      <Label htmlFor={allergy.value} className="font-normal cursor-pointer flex-1">
                        {allergy.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="custom-restrictions" className="text-base font-semibold mb-2 block">
                  {t("mealplanner.form.customrestrictions")}
                </Label>
                <Textarea
                  id="custom-restrictions"
                  value={customRestrictions}
                  onChange={(e) => setCustomRestrictions(e.target.value)}
                  placeholder={t("mealplanner.form.customrestrictions.placeholder")}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("mealplanner.form.back")}
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedStep1) ||
                  (currentStep === 2 && !canProceedStep2)
                }
              >
                {t("mealplanner.form.next")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="bg-primary hover:bg-primary/90"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("mealplanner.form.generating")}
                  </>
                ) : (
                  t("mealplanner.form.generate")
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

