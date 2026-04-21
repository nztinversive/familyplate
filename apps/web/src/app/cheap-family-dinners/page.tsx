import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Cheap Family Dinners: Free Recipe Generator (Use What You Have) | FamilyPlate",
  description:
    "Cheap family dinners that don't taste cheap. Type your pantry, get 3 dinners under $3-5 per serving — built around what you already own.",
  alternates: { canonical: "/cheap-family-dinners" },
  openGraph: {
    title: "Cheap Family Dinners — Generated From Your Pantry",
    description:
      "3 family dinners under $3-5 per serving, built around what you already have. Free.",
    type: "website",
    url: "/cheap-family-dinners",
  },
};

const content: AeoContent = {
  slug: "cheap-family-dinners",
  h1: "Cheap family dinners that don't taste cheap",
  subhead:
    "Use what you already paid for. Get 3 dinner ideas built from your pantry — most cost $3-5 per serving.",
  formDefaults: {
    placeholder: "e.g. dried beans, rice, eggs, canned tomatoes, onion, frozen veg, pasta",
    craving: "budget-friendly, stretches a long way",
    buttonLabel: "Find cheap dinners from my pantry",
  },
  sections: [
    {
      h2: "The cheapest meal is the one you don't have to shop for",
      body: [
        "The grocery run is where the budget breaks. You walk in for two things, walk out with $80 of \"while I'm here.\" The cheapest dinner isn't the one with the lowest ingredient list — it's the one made entirely from food you already bought.",
        "A pantry-first generator works in the order that protects your wallet. It looks at what's already paid for, builds dinner around it, and only then tells you what (if anything) you need to grab.",
      ],
    },
    {
      h2: "The cheapest pantry staples per serving",
      body: ["These are the ingredients that stretch furthest. Stock these and the generator can build dinner around them indefinitely:"],
      bullets: [
        "Dried beans (~$0.20/serving) — black, pinto, kidney, chickpeas",
        "Rice (~$0.15/serving) — white, brown, jasmine",
        "Pasta (~$0.30/serving) — any shape on sale",
        "Eggs (~$0.50/serving when on sale) — frittata, fried rice, breakfast for dinner",
        "Frozen vegetables (~$0.50/serving) — cheaper and often fresher than wilted produce",
        "Canned tomatoes (~$0.30/serving) — base for sauces, soups, chili",
        "Whole chicken (~$1.50/serving) — cheaper than parts, yields broth too",
        "Ground beef on sale (~$2/serving)",
      ],
    },
    {
      h2: "Stretch tactics the generator uses",
      body: [
        "When you tag the craving as \"budget,\" the prompt favors a few specific patterns: bean and grain bowls, one-pan rice dishes, sheet pan with cheap proteins, soup with day-old bread, leftover-friendly dinners that yield two meals.",
        "It also leans toward recipes where the protein is a flavoring, not the main weight — sausage in a bean stew, ground beef in tacos, chicken in a stir fry. You get the satisfaction without the protein cost.",
      ],
    },
    {
      h2: "Why this beats meal kits",
      body: [
        "Meal kits run $8-12 per serving. The math says cooking from your pantry is at least 2x cheaper, often 4x. The trade-off used to be decision fatigue (\"what do I make with this?\") — that's what the generator solves.",
        "Type the cheap pantry items, get three dinners. Pick the one you actually want. Five minutes of decision, $20 saved.",
      ],
    },
  ],
  examples: [
    {
      name: "One-Pot Black Bean & Rice",
      description:
        "Classic cheap dinner that's actually good. Smoky beans, fluffy rice, lime, hot sauce. Vegetarian by default; add chorizo or chicken if you have it.",
      estimatedTime: 30,
      servings: 4,
      ingredients: [
        "2 cans black beans, drained",
        "1.5 cups jasmine rice",
        "3 cups chicken or veg broth",
        "1 onion, diced",
        "3 cloves garlic, minced",
        "1 tsp cumin, 1 tsp paprika",
        "1 lime, salt, pepper",
        "Hot sauce, optional",
      ],
      steps: [
        "Sauté onion in oil 5 min until soft. Add garlic, cumin, paprika.",
        "Add rice, stir to coat in spices.",
        "Add broth and beans. Bring to a boil.",
        "Reduce to low, cover, cook 18 min until rice is tender.",
        "Squeeze lime over top, salt to taste.",
        "Serve with hot sauce.",
      ],
    },
    {
      name: "Sheet Pan Sausage, Potato & Cabbage",
      description:
        "Cabbage is the most underrated cheap vegetable. Roasted hot, it caramelizes and goes sweet. Smoked sausage and potatoes round it out for under $4/serving.",
      estimatedTime: 35,
      servings: 4,
      ingredients: [
        "1 lb smoked sausage, sliced",
        "1 lb potatoes, cubed",
        "1/2 head cabbage, wedged",
        "1 onion, wedged",
        "3 tbsp oil",
        "1 tsp paprika, salt, pepper",
      ],
      steps: [
        "Preheat oven to 425°F.",
        "Toss potatoes with oil, salt. Roast 15 min.",
        "Add sausage, cabbage wedges, onion. Toss with paprika.",
        "Roast 20 more min until cabbage is browned at edges.",
        "Serve hot.",
      ],
    },
  ],
  faq: [
    {
      q: "How cheap can dinner actually get?",
      a: "Vegetarian dinners built on dried beans, rice, and eggs can come in at $1.50-2.50 per serving. With cheap meat (sale ground beef, sausage, whole chicken), $3-4 is realistic for a family dinner that doesn't feel like a sacrifice.",
    },
    {
      q: "What if my pantry is mostly empty?",
      a: "Stock the staples list above first — beans, rice, pasta, canned tomatoes, frozen veg. That $30 of staples becomes the base for two weeks of dinners. The generator gets dramatically more useful as the pantry deepens.",
    },
    {
      q: "Are 'cheap' dinners less healthy?",
      a: "Often the opposite. Beans, lentils, eggs, and frozen vegetables are nutritionally strong and cheap. The expensive convenience-food shortcuts (frozen pizza, mac and cheese boxes) are what tend to be worst.",
    },
    {
      q: "How does this compare to a budget meal subscription?",
      a: "Subscriptions still buy ingredients you don't have. This generator only suggests dinners you can make from what you already own, then proposes a short shopping list for whatever's missing.",
    },
  ],
  related: [
    { href: "/pantry-to-dinner", label: "Pantry-to-dinner generator" },
    { href: "/dinner-ideas-ground-beef", label: "Ground beef dinner ideas" },
    { href: "/dinner-ideas-pasta", label: "Pasta dinner ideas" },
    { href: "/weeknight-dinner-ideas", label: "Weeknight dinner ideas" },
    { href: "/quick-family-dinners-30-minutes", label: "30-minute family dinners" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
