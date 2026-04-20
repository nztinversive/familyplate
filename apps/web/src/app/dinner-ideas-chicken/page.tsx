import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Chicken Dinner Ideas: Free Generator Using Your Pantry | FamilyPlate",
  description:
    "Have chicken? Type your other pantry items and get 3 family dinner ideas tonight. Stir fry, bowls, sheet pan, and more — built around what you already have.",
  alternates: { canonical: "/dinner-ideas-chicken" },
  openGraph: {
    title: "Chicken Dinner Ideas — Generated From Your Pantry",
    description:
      "3 chicken dinners tonight, built around what's already in your kitchen. Free.",
    type: "website",
    url: "/dinner-ideas-chicken",
  },
};

const content: AeoContent = {
  slug: "dinner-ideas-chicken",
  h1: "Chicken dinner ideas, built around your pantry",
  subhead:
    "Have chicken in the fridge? Tell the generator what else you've got. Get 3 dinners tonight — no \"buy 12 things\" recipes.",
  formDefaults: {
    pantry: "chicken thighs",
    placeholder: "chicken thighs, plus what else? rice, garlic, onion, soy sauce, frozen veg...",
    buttonLabel: "Find chicken dinners",
  },
  sections: [
    {
      h2: "Why chicken is the best pantry-pairs protein",
      body: [
        "Chicken takes any flavor you throw at it. Asian aromatics, Italian herbs, Mexican spices, North African seasonings — all work. That makes it the perfect base when you don't know what you have.",
        "It also cooks fast (15-25 minutes for thighs or breasts in most preparations) and forgives variations in technique. Even mediocre cooks turn out good chicken.",
      ],
    },
    {
      h2: "Patterns that work with almost any chicken",
      body: ["The generator leans on these patterns when chicken is the lead ingredient:"],
      bullets: [
        "Stir fry — chicken + 1 vegetable + soy/garlic/ginger over rice",
        "Sheet pan — chicken + potatoes + a hardy vegetable, all roasted at 425°F",
        "Pasta — chicken + pasta + cream or tomato + cheese",
        "Bowl — chicken + grain + vegetables + sauce",
        "Tacos — shredded chicken + tortillas + slaw + salsa",
        "Soup — chicken + broth + noodles or rice + vegetables",
      ],
    },
    {
      h2: "Cuts and what they're best for",
      body: ["The cut you have changes what works best:"],
      bullets: [
        "Boneless thighs — most forgiving, great for stir fry, curry, sheet pan",
        "Bone-in thighs — best for roasting, braising, soups",
        "Breasts — fast for stir fry and pasta, easy to overcook (pull at 160°F)",
        "Whole chicken — roast it once, get 2-3 dinners and a pot of broth",
        "Ground chicken — meatballs, lettuce wraps, stir fry, chili",
        "Pre-cooked / leftover — quesadillas, salads, soups, pasta",
      ],
    },
    {
      h2: "What to add to your pantry list",
      body: [
        "More aromatics in the list = more interesting suggestions. Garlic, onion, ginger, lemon, soy sauce, paprika, cumin, oregano. The generator can build distinct dinners from the same chicken if the supporting cast is varied.",
        "If you have a specific cuisine in mind, put it in the craving box (\"Asian,\" \"Italian,\" \"Mexican-inspired\"). All three suggestions will lean that direction.",
      ],
    },
  ],
  examples: [
    {
      name: "Garlic Chicken Stir Fry",
      description:
        "20-minute weeknight stir fry. Chicken thighs sear hot, then toss with garlic, soy, and any frozen vegetable you have on hand.",
      estimatedTime: 20,
      servings: 4,
      ingredients: [
        "1 lb chicken thighs, cubed",
        "2 cups frozen broccoli or mixed veg",
        "4 cloves garlic, minced",
        "3 tbsp soy sauce",
        "1 tbsp sesame oil",
        "1 tbsp neutral oil",
        "2 cups cooked rice",
      ],
      steps: [
        "Cook rice. Heat both oils in a large pan over high heat.",
        "Add chicken, sear 5-6 min until golden.",
        "Add garlic, cook 30 sec.",
        "Add frozen veg, toss to combine, cook 4 min.",
        "Pour soy sauce over, toss, cook 1 min more.",
        "Serve over rice.",
      ],
    },
    {
      name: "Sheet Pan Lemon Chicken & Potatoes",
      description:
        "One pan, 35 minutes, almost no work. Bone-in thighs and baby potatoes roast together with lemon, garlic, and herbs.",
      estimatedTime: 40,
      servings: 4,
      ingredients: [
        "4 bone-in chicken thighs",
        "1 lb baby potatoes, halved",
        "1 lemon, sliced",
        "5 cloves garlic, smashed",
        "3 tbsp olive oil",
        "2 tsp dried oregano, salt, pepper",
      ],
      steps: [
        "Preheat oven to 425°F.",
        "Toss potatoes with 2 tbsp oil, salt, pepper on a sheet pan.",
        "Pat chicken dry, rub with remaining oil, oregano, salt, pepper. Place on pan.",
        "Scatter garlic and lemon slices around.",
        "Roast 35-40 min until chicken hits 175°F and potatoes are crispy.",
        "Rest 5 min, serve.",
      ],
    },
  ],
  faq: [
    {
      q: "Frozen chicken — can I use it?",
      a: "Yes, but it changes the technique. Thaw overnight in the fridge if possible. If cooking from frozen, sheet pan and slow simmer methods work; stir fry and pan sear do not.",
    },
    {
      q: "How much chicken per person?",
      a: "About 4-6 ounces of raw boneless chicken per adult, 2-3 ounces per kid. A 1 lb pack feeds a family of four with leftovers, especially in stir fry or pasta where it stretches further.",
    },
    {
      q: "What's the safe internal temp?",
      a: "165°F for breasts, 175°F for thighs. Thighs taste better at 175°F+ because the connective tissue breaks down.",
    },
    {
      q: "I have leftover cooked chicken — what now?",
      a: "Type \"cooked chicken, [other items]\" in the pantry box. The generator will skip cooking the chicken and propose dinners that use it as-is — quesadillas, fried rice, pasta, soup, salad.",
    },
  ],
  related: [
    { href: "/pantry-to-dinner", label: "Full pantry-to-dinner generator" },
    { href: "/dinner-ideas-ground-beef", label: "Ground beef dinner ideas" },
    { href: "/dinner-ideas-pasta", label: "Pasta dinner ideas" },
    { href: "/quick-family-dinners-30-minutes", label: "Quick family dinners" },
    { href: "/weeknight-dinner-ideas", label: "Weeknight dinner ideas" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
