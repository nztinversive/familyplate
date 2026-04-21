import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Pantry to Dinner Generator: Free Recipes From Your Kitchen",
  description:
    "Type what's in your pantry. Get 3 family dinner ideas you can cook tonight — plus a short list of what's missing. Free, no signup.",
  alternates: { canonical: "/pantry-to-dinner" },
  openGraph: {
    title: "Pantry to Dinner: Free Recipe Generator",
    description:
      "Type what's in your pantry. Get 3 family dinner ideas tonight, plus a short list for what's missing.",
    type: "website",
    url: "/pantry-to-dinner",
  },
};

const content: AeoContent = {
  slug: "pantry-to-dinner",
  h1: "Pantry to dinner, in 10 seconds",
  subhead:
    "Type what you've got. Get 3 dinners you can actually cook tonight — and exactly what you're missing.",
  formDefaults: {
    placeholder: "e.g. chicken thighs, jasmine rice, frozen broccoli, soy sauce, garlic, sesame oil",
    buttonLabel: "Find dinners from my pantry",
  },
  sections: [
    {
      h2: "How it works",
      body: [
        "List what's actually in your kitchen — pantry, fridge, freezer. Don't worry about quantities. The generator looks at what you have, what you're allergic to, and what the family usually likes, then proposes three realistic dinners that lean on your ingredients.",
        "For each dinner, you see the ingredients you already have, the ones you'd need to grab, the cook time, and the steps. No 47-ingredient recipes that need three trips to the store.",
      ],
    },
    {
      h2: "Why pantry-first beats recipe-first",
      body: [
        "Most recipe sites work backwards. You pick a dish you like, then drive to the store for the eight things you don't have. By the time you cook, you've spent more on a Tuesday meal than a Saturday dinner out.",
        "Pantry-first flips this. You start with what's already paid for, sitting in the cabinet, often three weeks from expiring. The recipe is built around your reality, not a food blogger's.",
      ],
    },
    {
      h2: "What to type to get good results",
      body: [
        "More items = better suggestions. You don't need to be precise — \"chicken,\" \"rice,\" and \"frozen veg\" is enough. The generator handles fuzzy names.",
      ],
      bullets: [
        "Proteins you have: chicken, ground beef, eggs, beans, tofu",
        "Carbs and grains: pasta, rice, tortillas, bread, potatoes",
        "Frozen and canned: frozen veg, canned tomatoes, beans, broth",
        "Aromatics and basics: onion, garlic, soy sauce, lemon, herbs",
        "Anything sitting in the fridge that needs to get used this week",
      ],
    },
    {
      h2: "Allergies and dislikes",
      body: [
        "Tag any allergies in the form. The generator excludes the allergen and its derivatives — milk allergy means no butter, cheese, cream, yogurt, or whey. Wheat allergy means no flour, bread, pasta, or soy sauce. There's a server-side safety pass on every result.",
        "If a household member just hates mushrooms, mention it in the craving box (\"no mushrooms\") and it'll skip them.",
      ],
    },
  ],
  examples: [
    {
      name: "Garlic Chicken & Broccoli Stir Fry",
      description:
        "Quick stovetop dinner using common pantry staples. Crispy chicken, garlic-soy glaze, charred broccoli over rice.",
      estimatedTime: 25,
      servings: 4,
      ingredients: [
        "1 lb chicken thighs, cubed",
        "1 head broccoli or 2 cups frozen florets",
        "4 cloves garlic, minced",
        "3 tbsp soy sauce",
        "1 tbsp sesame oil",
        "2 cups cooked jasmine rice",
      ],
      steps: [
        "Cook rice according to package directions.",
        "Heat sesame oil in a large pan over high heat. Add chicken and sear until golden, 5-6 min.",
        "Add garlic and cook 30 seconds until fragrant.",
        "Add broccoli and stir fry 4-5 min until bright green.",
        "Pour in soy sauce, toss to coat, cook 1 more minute.",
        "Serve over rice.",
      ],
    },
    {
      name: "Sheet Pan Sausage & Veggies",
      description:
        "One pan, 30 minutes, almost anything you have. Smoked sausage, onions, peppers, potatoes — roasted hot until crispy.",
      estimatedTime: 35,
      servings: 4,
      ingredients: [
        "1 lb smoked sausage, sliced",
        "1 lb baby potatoes, halved",
        "2 bell peppers, chunked",
        "1 large onion, wedged",
        "3 tbsp olive oil",
        "1 tsp paprika, salt, pepper to taste",
      ],
      steps: [
        "Preheat oven to 425°F.",
        "Toss potatoes with half the oil, salt, pepper. Roast 15 min.",
        "Add sausage, peppers, onion. Toss with remaining oil and paprika.",
        "Roast 15-20 more min, until potatoes are crispy.",
        "Serve hot from the pan.",
      ],
    },
  ],
  faq: [
    {
      q: "Do I need to list quantities?",
      a: "No. Just the names of the ingredients is enough. The generator assumes reasonable quantities and will tell you what to buy if anything's missing.",
    },
    {
      q: "What if I don't have many ingredients?",
      a: "It still works with as few as 4-5 items, but suggestions get better with more. If you list 10-15 things, you'll get more interesting dinners that don't all rely on the same staples.",
    },
    {
      q: "How is this different from asking ChatGPT?",
      a: "Three things: it tracks what's in your pantry across visits if you sign up, it has a server-side allergy safety check, and it formats results as actual recipe cards with shopping lists — not paragraphs of text.",
    },
    {
      q: "Is it really free?",
      a: "Yes — the public generator is free with a daily limit per browser. Sign up free for unlimited use, weekly meal plans, and pantry tracking.",
    },
  ],
  related: [
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/dinner-ideas-ground-beef", label: "Ground beef dinner ideas" },
    { href: "/quick-family-dinners-30-minutes", label: "30-minute family dinners" },
    { href: "/cheap-family-dinners", label: "Cheap family dinners" },
    { href: "/allergy-safe-meal-planner", label: "Allergy-safe meal planner" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
