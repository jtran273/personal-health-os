import test from "node:test";
import assert from "node:assert/strict";
import { MealLogService, createKnownFoodFromCorrection } from "@/lib/health/meals";

const knownFoods = [
  createKnownFoodFromCorrection({ name: "Chicken rice bowl", calories: 720, proteinGrams: 48 }),
  createKnownFoodFromCorrection({ name: "Protein shake", calories: 160, proteinGrams: 30 }),
  createKnownFoodFromCorrection({ name: "Rice", calories: 200, proteinGrams: 4 })
];

test("parses explicit calories and protein stated in text as meal_text", () => {
  const result = new MealLogService().estimateMacros({ text: "post-workout meal, 550 cal and 40g protein" });

  assert.equal(result.source, "meal_text");
  assert.equal(result.confidence, "high");
  assert.equal(result.estimatedCalories?.value, 550);
  assert.equal(result.estimatedCalories?.source, "meal_text");
  assert.equal(result.estimatedProteinGrams?.value, 40);
  assert.match(result.notes.join(" "), /no macros were invented/i);
});

test("hedged numbers ('~', 'about', 'roughly') drop confidence to medium", () => {
  for (const text of ["~600 calories", "about 600 cal", "roughly 600 kcal"]) {
    const result = new MealLogService().estimateMacros({ text });
    assert.equal(result.confidence, "medium", `expected medium for: ${text}`);
    assert.equal(result.estimatedCalories?.value, 600, `expected 600 for: ${text}`);
  }
});

test("recognizes 'kcal' and 'calories: 480' phrasings", () => {
  assert.equal(new MealLogService().estimateMacros({ text: "lunch 480kcal" }).estimatedCalories?.value, 480);
  assert.equal(new MealLogService().estimateMacros({ text: "calories: 480" }).estimatedCalories?.value, 480);
});

test("ignores out-of-range stated values instead of trusting them", () => {
  const result = new MealLogService().estimateMacros({ text: "12 cal snack" });
  // 12 is below the plausible floor, so no calorie value is surfaced and nothing else matches.
  assert.equal(result.estimatedCalories, undefined);
  assert.equal(result.source, "unknown");
});

test("vague text with no numbers and no known-food match stays unknown", () => {
  const result = new MealLogService(knownFoods).estimateMacros({ text: "some leftovers from last night" });
  assert.equal(result.source, "unknown");
  assert.equal(result.confidence, "unknown");
  assert.equal(result.estimatedCalories, undefined);
});

test("a bare unknown food name is never assigned invented macros", () => {
  const result = new MealLogService(knownFoods).estimateMacros({ text: "2 eggs and toast" });
  assert.equal(result.source, "unknown");
  assert.equal(result.estimatedCalories, undefined);
});

test("single known-food match keeps the original first-match contract", () => {
  const result = new MealLogService(knownFoods).estimateMacros({ text: "had another chicken rice bowl" });
  assert.equal(result.source, "known_food");
  assert.equal(result.confidence, "medium");
  assert.equal(result.estimatedCalories?.value, 720);
  assert.equal(result.matchedKnownFood?.name, "Chicken rice bowl");
});

test("sums multiple known foods mentioned in one message", () => {
  const result = new MealLogService(knownFoods).estimateMacros({ text: "chicken rice bowl and a protein shake" });
  assert.equal(result.source, "known_food");
  assert.equal(result.confidence, "medium");
  // 720 + 160, with the overlapping bare "rice" match dropped in favor of "chicken rice bowl".
  assert.equal(result.estimatedCalories?.value, 880);
  assert.equal(result.estimatedProteinGrams?.value, 78);
  assert.match(result.notes.join(" "), /summed 2 known foods/i);
});

test("explicit stated numbers outrank a known-food match for the same meal", () => {
  const result = new MealLogService(knownFoods).estimateMacros({ text: "chicken rice bowl but only ate half, ~360 cal" });
  assert.equal(result.source, "meal_text");
  assert.equal(result.confidence, "medium");
  assert.equal(result.estimatedCalories?.value, 360);
});

test("corrected values still win over everything", () => {
  const result = new MealLogService(knownFoods).estimateMacros({
    text: "chicken rice bowl 900 cal",
    correctedCalories: 815,
    correctedProteinGrams: 50
  });
  assert.equal(result.source, "manual_entry");
  assert.equal(result.confidence, "high");
  assert.equal(result.estimatedCalories?.value, 815);
});
