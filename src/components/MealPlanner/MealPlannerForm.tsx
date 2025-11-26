'use client';

import { useState } from "react";
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

const FITNESS_GOALS = [
  { value: "lose_weight", label: "Lose Weight" },
  { value: "gain_weight", label: "Gain Weight" },
  { value: "maintain_weight", label: "Maintain Weight" },
  { value: "build_muscle", label: "Build Muscle" },
  { value: "improve_fitness", label: "Improve Fitness" },
];

const DIET_TYPES = [
  { value: "balanced", label: "Balanced" },
  { value: "keto", label: "Ketogenic (Keto)" },
  { value: "intermittent_fasting", label: "Intermittent Fasting" },
  { value: "high_protein", label: "High Protein" },
  { value: "high_carb", label: "High Carbohydrate" },
  { value: "low_carb", label: "Low Carbohydrate" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "paleo", label: "Paleo" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "gluten_free", label: "Gluten-Free" },
  { value: "dairy_free", label: "Dairy-Free" },
  { value: "low_fodmap", label: "Low-FODMAP" },
  { value: "pescatarian", label: "Pescatarian" },
];

const PLAN_DURATIONS = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 21, label: "21d" },
  { value: 30, label: "30d" },
];

const ALLERGIES = [
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

const EXERCISE_OPTIONS = [
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

export function MealPlannerForm({ profile, onGenerate, generating }: MealPlannerFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Fitness Goals
  const [endGoal, setEndGoal] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("");
  const [exercisePlan, setExercisePlan] = useState<string>("");
  const [exercisePreferences, setExercisePreferences] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState<string>("");

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

    const formData: MealPlannerFormData = {
      endGoal,
      targetWeight: parseFloat(targetWeight),
      timeframe: parseInt(timeframe),
      exercisePlan,
      exercisePreferences,
      additionalInfo,
      dietType,
      mealsPerDay: parseInt(mealsPerDay),
      includeSnacks,
      planDuration,
      allergies,
      customRestrictions,
    };

    await onGenerate(formData);
  };

  const canProceedStep1 = endGoal && targetWeight && timeframe && exercisePreferences.length > 0;
  const canProceedStep2 = dietType && mealsPerDay;
  const canGenerate = canProceedStep1 && canProceedStep2;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Create Your Diet Plan</h2>
          <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
        </div>
        <Progress value={progress} className="h-2 bg-muted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Fitness Goals"}
            {currentStep === 2 && "Diet Preferences"}
            {currentStep === 3 && "Health & Restrictions"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Tell us about your fitness goals and preferences"}
            {currentStep === 2 && "Customize your dietary preferences"}
            {currentStep === 3 && "Any allergies or restrictions?"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Fitness Goals */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-4 block">Your End Goal</Label>
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
                  Target Ideal Weight (kg)
                </Label>
                {idealWeightRange && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Ideal range: {idealWeightRange.min} - {idealWeightRange.max} kg
                  </p>
                )}
                <Input
                  id="target-weight"
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder={profile?.weight_kg ? `Current: ${profile.weight_kg} kg` : "e.g., 70"}
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="timeframe" className="text-base font-semibold mb-2 block">
                  Timeframe (weeks)
                </Label>
                <Input
                  id="timeframe"
                  type="number"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  placeholder="e.g., 12"
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label className="text-base font-semibold mb-4 block">
                  Exercise Plan
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select the workouts you can commit to during this plan.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXERCISE_OPTIONS.map((exercise) => (
                    <div
                      key={exercise}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={exercise}
                        checked={exercisePreferences.includes(exercise)}
                        onCheckedChange={() => handleExerciseToggle(exercise)}
                      />
                      <Label htmlFor={exercise} className="font-normal cursor-pointer flex-1">
                        {exercise}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Label htmlFor="exercise-plan" className="text-sm font-medium mb-2 block">
                    Additional Exercise Details (Optional)
                  </Label>
                  <Textarea
                    id="exercise-plan"
                    value={exercisePlan}
                    onChange={(e) => setExercisePlan(e.target.value)}
                    placeholder="e.g., Prefer evening workouts, gym access twice a week"
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="additional-info" className="text-base font-semibold mb-2 block">
                  Additional Information
                </Label>
                <Textarea
                  id="additional-info"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any other relevant information about your goals..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Diet Preferences */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-4 block">Diet Type</Label>
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
                  Number of Meals per Day
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
                <Label className="text-base font-semibold mb-4 block">Include Snacks?</Label>
                <RadioGroup
                  value={includeSnacks ? "yes" : "no"}
                  onValueChange={(value) => setIncludeSnacks(value === "yes")}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="yes" id="snacks-yes" />
                    <Label htmlFor="snacks-yes" className="font-normal cursor-pointer flex-1">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="no" id="snacks-no" />
                    <Label htmlFor="snacks-no" className="font-normal cursor-pointer flex-1">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-semibold mb-4 block">Plan Duration (days)</Label>
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
                  Allergies (Select all that apply)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ALLERGIES.map((allergy) => (
                    <div key={allergy} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={allergy}
                        checked={allergies.includes(allergy)}
                        onCheckedChange={() => handleAllergyToggle(allergy)}
                      />
                      <Label htmlFor={allergy} className="font-normal cursor-pointer flex-1">
                        {allergy}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="custom-restrictions" className="text-base font-semibold mb-2 block">
                  Custom Dietary Restrictions (Optional)
                </Label>
                <Textarea
                  id="custom-restrictions"
                  value={customRestrictions}
                  onChange={(e) => setCustomRestrictions(e.target.value)}
                  placeholder="e.g., Low sodium, diabetic-friendly"
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
              Back
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
                Next
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
                    Generating...
                  </>
                ) : (
                  "Generate My Plan"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

