import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Allergy-Safe Meal Planner: Free Dinner Ideas That Skip Your Allergens | FamilyPlate",
  description:
    "Tell it what you're allergic to and what's in your pantry. Get 3 family dinners that exclude the allergen and all its derivatives. Server-side safety check included.",
  alternates: { canonical: "/allergy-safe-meal-planner" },
  openGraph: {
    title: "Allergy-Safe Meal Planner — Free Dinner Generator",
    description:
      "3 family dinners that skip your allergens — and all the sneaky derivatives. Free.",
    type: "website",
    url: "/allergy-safe-meal-planner",
  },
};

const content: AeoContent = {
  slug: "allergy-safe-meal-planner",
  h1: "Allergy-safe meal planner",
  subhead:
    "List your allergens and your pantry. Get 3 dinner ideas that skip the allergen — and the derivatives most apps miss.",
  formDefaults: {
    placeholder: "e.g. ground turkey, rice, olive oil, onion, garlic, frozen spinach",
    buttonLabel: "Find allergy-safe dinners",
  },
  sections: [
    {
      h2: "Why most allergy filters quietly fail",
      body: [
        "Most recipe sites filter on a single keyword. \"Dairy free\" excludes \"milk\" — but lets through butter, cheese, yogurt, whey, casein, and ghee. The recipe looks safe in the title, then the ingredient list has parmesan in it.",
        "Wheat allergy is even worse. People filter \"wheat\" and miss flour, breadcrumbs, soy sauce, beer, malt, and seitan. A recipe titled \"gluten-free\" can still contain wheat-derived ingredients if the source isn't careful.",
      ],
    },
    {
      h2: "How the allergen safety check works here",
      body: [
        "When you tag an allergen, the generator does two things. First, it tells the AI to exclude the allergen and its derivative family — milk means no butter, cream, cheese, yogurt, whey, casein, ghee. Wheat means no flour, breadcrumbs, pasta, soy sauce, malt, beer.",
        "Second, after the AI returns recipes, a server-side safety pass scans every ingredient name against the derivative map. If anything slips through, that recipe is dropped before you ever see it. You get whatever survives the filter.",
      ],
    },
    {
      h2: "Allergens covered",
      body: ["The system handles the major allergens with their derivative families:"],
      bullets: [
        "Dairy — milk, butter, cream, cheese, yogurt, whey, casein, ghee",
        "Wheat / gluten — flour, breadcrumbs, pasta, soy sauce (most brands), seitan, malt",
        "Eggs — whole eggs, egg whites, mayo, hollandaise, many baked items",
        "Tree nuts — almond, walnut, pecan, cashew, pistachio, hazelnut, pesto",
        "Peanuts — including peanut oil, peanut butter, satay sauces",
        "Soy — soy sauce, tofu, tempeh, edamame, miso, soybean oil in some uses",
        "Shellfish — shrimp, crab, lobster, scallops, fish sauce in some prep",
        "Fish — finned fish, fish sauce, anchovy, worcestershire",
      ],
    },
    {
      h2: "How to get the safest results",
      body: [
        "Tag every allergy that applies to anyone at the table. Multiple allergies stack — the generator treats each one as a hard exclusion. If two people are allergic to two different things, both lists are enforced.",
        "If someone has a less-common allergy (sesame, mustard, sulfites), put it in the craving box as \"avoid sesame\" — the prompt will route around it even if it's not in the standard list.",
      ],
    },
  ],
  examples: [
    {
      name: "Dairy-Free Lemon Garlic Chicken & Rice",
      description:
        "No butter, no cream, no cheese. Crispy seared chicken with a bright lemon-garlic pan sauce, served over fluffy rice.",
      estimatedTime: 30,
      servings: 4,
      ingredients: [
        "1.5 lbs chicken thighs, boneless skinless",
        "3 tbsp olive oil",
        "5 cloves garlic, minced",
        "Juice and zest of 2 lemons",
        "1/2 cup chicken broth",
        "2 cups cooked jasmine rice",
        "Fresh parsley, chopped",
      ],
      steps: [
        "Cook rice. Pat chicken dry, season with salt and pepper.",
        "Heat olive oil in a large skillet over medium-high. Sear chicken 5 min per side until golden.",
        "Remove chicken. Add garlic to pan, cook 30 sec.",
        "Add lemon juice, zest, and broth. Simmer 3 min, scraping up bits.",
        "Return chicken to pan, simmer 5 min until cooked through.",
        "Serve over rice, topped with parsley.",
      ],
    },
    {
      name: "Gluten-Free Sheet Pan Sausage & Veggies",
      description:
        "Naturally gluten-free one-pan dinner. Smoked sausage (check label for wheat-free), potatoes, peppers, and onion roasted hot.",
      estimatedTime: 35,
      servings: 4,
      ingredients: [
        "1 lb gluten-free smoked sausage, sliced",
        "1 lb baby potatoes, halved",
        "2 bell peppers, chunked",
        "1 onion, wedged",
        "3 tbsp olive oil",
        "1 tsp paprika, salt, pepper",
      ],
      steps: [
        "Preheat oven to 425°F.",
        "Toss potatoes with half the oil, salt, pepper. Roast 15 min on a sheet pan.",
        "Add sausage, peppers, onion. Toss with remaining oil and paprika.",
        "Roast 15-20 more min, stirring once, until potatoes are crispy.",
        "Serve hot.",
      ],
    },
  ],
  faq: [
    {
      q: "Is this safe enough for severe allergies?",
      a: "It's a strong first filter, but always read the recipe and check labels on packaged ingredients yourself. AI is not a substitute for the standard safety practices severe-allergy households already follow. Cross-contamination risk for processed ingredients depends on the brand.",
    },
    {
      q: "Can I add multiple allergies?",
      a: "Yes. Tag every allergen on the form. The generator enforces all of them simultaneously and drops recipes that include any of them.",
    },
    {
      q: "What if my child outgrows an allergy?",
      a: "Untag it on the form for new generations. Sign up for the full app to save per-household allergen profiles that update once instead of every time.",
    },
    {
      q: "Why server-side filtering?",
      a: "Because LLMs sometimes ignore instructions. The post-generation pass catches anything the AI got wrong before it reaches your screen. It's a safety net, not the only line of defense.",
    },
  ],
  related: [
    { href: "/pantry-to-dinner", label: "Pantry-to-dinner generator" },
    { href: "/picky-eater-dinner-ideas", label: "Picky eater dinner ideas" },
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/quick-family-dinners-30-minutes", label: "Quick family dinners" },
    { href: "/weeknight-dinner-ideas", label: "Weeknight dinner ideas" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
