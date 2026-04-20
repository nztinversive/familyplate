import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Picky Eater Dinner Ideas From Your Pantry | FamilyPlate",
  description:
    "Picky eaters at the table? Generate 3 mild, recognizable dinners from what's in your kitchen. Free, no signup. Real food kids actually eat.",
  alternates: { canonical: "/picky-eater-dinner-ideas" },
  openGraph: {
    title: "Picky Eater Dinner Ideas — Generated From Your Pantry",
    description:
      "3 mild, kid-tested dinners from what's already in your kitchen. Free, no signup.",
    type: "website",
    url: "/picky-eater-dinner-ideas",
  },
};

const content: AeoContent = {
  slug: "picky-eater-dinner-ideas",
  h1: "Picky eater dinner ideas (that they'll actually eat)",
  subhead:
    "Type what's in your kitchen. Get 3 mild, familiar dinners — no weird greens, no spicy surprises, no rejection.",
  formDefaults: {
    placeholder: "e.g. chicken, rice, pasta, cheese, butter, milk, frozen peas",
    craving: "mild, kid-friendly, simple flavors, no strong spices, recognizable",
    buttonLabel: "Find picky-eater dinners",
  },
  sections: [
    {
      h2: "What 'picky eater friendly' actually means",
      body: [
        "It's not about dumbing food down. It's about avoiding the things that get rejected: strong vegetables touching the protein, sauces with visible specks, surprise textures, anything green on top of anything else.",
        "The generator is tuned to favor recognizable shapes (nuggets, meatballs, pasta, rice bowls), mild seasonings (garlic, butter, parmesan, ketchup-adjacent), and meals that can be deconstructed if needed — kids who don't like sauce can have it on the side.",
      ],
    },
    {
      h2: "Strategies that actually work",
      body: ["A few patterns help more than any single recipe:"],
      bullets: [
        "Build-your-own dinners (taco bar, pasta bar, rice bowls) — kids assemble what they like",
        "Familiar shape, slight upgrade (homemade chicken tenders instead of frozen)",
        "One safe protein, one safe carb, one ignorable veg — the veg is bonus, not required",
        "Sauces and seasonings on the side, not pre-mixed in",
        "Repeat winners every 7-10 days — boredom isn't the enemy, novelty is",
      ],
    },
    {
      h2: "What to type into the generator",
      body: [
        "Lean into safe ingredients: chicken, ground beef, pasta, rice, tortillas, cheese, butter. Add whatever fruit and frozen veg the kids will eat. Skip the bok choy.",
        "If the picky eater has specific food refusals (\"no mushrooms,\" \"no spicy\"), put them in the craving box and the generator will route around them.",
      ],
    },
    {
      h2: "Why most 'kid-friendly' lists miss",
      body: [
        "Most articles list dishes — sloppy joes, mac and cheese, chicken tenders. Useful, but generic. They don't account for what's in your kitchen tonight or which version of \"chicken\" your kid eats.",
        "A pantry-based generator works backwards from your reality. If you only have ground turkey and the kid will only eat ground beef, the generator either substitutes intelligently or skips that recipe and proposes something else.",
      ],
    },
  ],
  examples: [
    {
      name: "Crispy Chicken Tenders & Rice",
      description:
        "Homemade tenders that beat frozen — five-ingredient breading, baked or pan-fried. Plain rice on the side, applesauce or fruit to round it out.",
      estimatedTime: 25,
      servings: 4,
      ingredients: [
        "1 lb chicken tenders",
        "1 cup panko or breadcrumbs",
        "1/2 cup flour",
        "2 eggs, beaten",
        "1/2 tsp salt, 1/4 tsp pepper",
        "2 cups cooked white rice",
      ],
      steps: [
        "Preheat oven to 425°F or heat 1/4 inch oil in a pan.",
        "Set up three bowls: flour, beaten eggs, panko with salt and pepper.",
        "Dredge each tender in flour, then egg, then panko.",
        "Bake on a wire rack 15-18 min until golden, or pan-fry 3 min per side.",
        "Serve with plain rice and a fruit on the side.",
      ],
    },
    {
      name: "Buttered Noodles with Hidden Parmesan",
      description:
        "The classic kid-survival meal. Slightly upgraded with grated parm melted in for actual nutrition. Serve plain pasta on the side for the most extreme cases.",
      estimatedTime: 15,
      servings: 4,
      ingredients: [
        "1 lb pasta (any shape they like)",
        "4 tbsp butter",
        "1/2 cup grated parmesan",
        "Salt to taste",
        "Optional: small handful frozen peas, mixed in",
      ],
      steps: [
        "Boil pasta in salted water until just tender.",
        "Drain, reserving 1/2 cup pasta water.",
        "Return pasta to pot, add butter and parm, toss until coated.",
        "Splash in pasta water if dry. Salt to taste.",
        "Serve immediately.",
      ],
    },
  ],
  faq: [
    {
      q: "What ages is this good for?",
      a: "Toddlers through tweens. The recipes default to mild flavors, recognizable shapes, and familiar textures — but adults can add hot sauce or spice on their own plate.",
    },
    {
      q: "My kid only eats five things. Will this help?",
      a: "Yes — list what they'll eat (chicken, pasta, cheese, etc.) in the pantry box and the generator will work within those constraints. It's not magic, but it'll find variations you haven't tried.",
    },
    {
      q: "Can I exclude specific things they hate?",
      a: "Type the things to avoid in the craving box (\"no mushrooms, no green peppers\"). The generator will skip recipes that lean on them.",
    },
    {
      q: "How do I get less repetition?",
      a: "Add more variety to the pantry list and try different cravings (\"comfort food,\" \"Italian,\" \"Mexican-inspired\"). Sign up for the full app to track which dinners actually got eaten and skip the ones that didn't.",
    },
  ],
  related: [
    { href: "/kid-friendly-dinner-ideas", label: "Kid-friendly dinner ideas" },
    { href: "/quick-family-dinners-30-minutes", label: "Quick family dinners" },
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/dinner-ideas-pasta", label: "Pasta dinner ideas" },
    { href: "/pantry-to-dinner", label: "Full pantry-to-dinner generator" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
