import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Ground Beef Dinner Ideas: Free Generator From Your Pantry | FamilyPlate",
  description:
    "Got ground beef? Type your other pantry items, get 3 family dinner ideas tonight — tacos, pasta bake, sloppy joes, and more.",
  alternates: { canonical: "/dinner-ideas-ground-beef" },
  openGraph: {
    title: "Ground Beef Dinner Ideas — From Your Pantry",
    description:
      "3 ground beef dinners tonight, built from your pantry. Free, no signup.",
    type: "website",
    url: "/dinner-ideas-ground-beef",
  },
};

const content: AeoContent = {
  slug: "dinner-ideas-ground-beef",
  h1: "Ground beef dinner ideas, from what's in your kitchen",
  subhead:
    "Pound of ground beef thawing? Add your other pantry items. Get 3 family dinners — tacos, pasta, skillet, sheet pan.",
  formDefaults: {
    pantry: "ground beef",
    placeholder: "ground beef, plus what else? onion, garlic, pasta, tomato sauce, cheese...",
    buttonLabel: "Find ground beef dinners",
  },
  sections: [
    {
      h2: "Why ground beef is the most flexible weeknight protein",
      body: [
        "Ground beef cooks in 8-10 minutes, browns in any pan, and takes any direction — Italian, Mexican, American, Asian. It's the cheap protein that works in the most cuisines.",
        "It also stretches with rice, beans, or pasta. A single pound feeds a family of four in tacos, six in chili, eight in a casserole.",
      ],
    },
    {
      h2: "Patterns the generator favors",
      body: ["With ground beef as the lead, these patterns produce reliable dinners:"],
      bullets: [
        "Tacos / burritos — beef + tortillas + cheese + whatever salsa or veg you have",
        "Pasta bolognese — beef + crushed tomatoes + onion + garlic + pasta",
        "Skillet chili — beef + canned beans + tomatoes + spices + cornbread or rice",
        "Sloppy joes — beef + tomato sauce + Worcestershire + buns",
        "Stuffed peppers — beef + rice + tomato + bell peppers",
        "Cheeseburger pasta — beef + cheese + pasta + tomato (kid favorite)",
        "Sheet pan meatballs — beef + breadcrumbs + egg + sauce of choice",
      ],
    },
    {
      h2: "Lean vs. fatty — what to pick",
      body: [
        "85/15 or 80/20 is the sweet spot for tacos, burgers, and meatballs — fat carries flavor and keeps the meat tender. 90/10 or leaner is fine for chili, pasta sauce, or anything with a long simmer that masks the dryness.",
        "If you only have lean, add 1-2 tbsp olive oil to the pan when browning to compensate.",
      ],
    },
    {
      h2: "How to stretch a single pound",
      body: [
        "A pound of ground beef alone serves 3-4 people. Stretch it to feed 6-8 by mixing with: a can of beans (chili), a cup of cooked lentils (pasta sauce), grated zucchini or mushrooms (meatballs), or extra rice (stuffed peppers).",
        "The generator stretches automatically when you tag the craving as \"budget\" or list cheap stretch ingredients in the pantry.",
      ],
    },
  ],
  examples: [
    {
      name: "20-Minute Beef Tacos",
      description:
        "Faster than driving to the taco place. Ground beef, taco spices, tortillas, and whatever toppings you have.",
      estimatedTime: 20,
      servings: 4,
      ingredients: [
        "1 lb ground beef",
        "1 onion, diced",
        "2 cloves garlic, minced",
        "1 tbsp chili powder, 1 tsp cumin, 1 tsp paprika",
        "1/2 tsp salt, 1/4 tsp pepper",
        "1/4 cup water",
        "8 small tortillas",
        "Toppings: cheese, lettuce, salsa, sour cream, lime",
      ],
      steps: [
        "Brown beef in a skillet over medium-high heat, 5-6 min. Drain excess fat.",
        "Add onion, cook 3 min. Add garlic, cook 30 sec.",
        "Add spices, salt, pepper, water. Simmer 3 min until thickened.",
        "Warm tortillas in a dry pan or microwave.",
        "Build tacos with beef and toppings.",
      ],
    },
    {
      name: "Skillet Cheeseburger Pasta",
      description:
        "Hamburger Helper without the box. One pan, 25 minutes, kids approved. Ground beef, pasta, tomato, melted cheese.",
      estimatedTime: 25,
      servings: 4,
      ingredients: [
        "1 lb ground beef",
        "1 onion, diced",
        "2 cloves garlic, minced",
        "1 can crushed tomatoes (14 oz)",
        "2 cups beef broth",
        "8 oz pasta (elbow, shells, or rotini)",
        "1 cup shredded cheddar",
        "1 tbsp Worcestershire (optional)",
      ],
      steps: [
        "Brown beef in a deep skillet over medium-high, 5 min. Drain.",
        "Add onion, cook 3 min. Add garlic, 30 sec.",
        "Add tomatoes, broth, pasta, Worcestershire. Stir, bring to simmer.",
        "Cover, reduce heat to medium-low, cook 12 min until pasta is tender.",
        "Sprinkle cheese on top, cover 2 min until melted.",
        "Serve from the pan.",
      ],
    },
  ],
  faq: [
    {
      q: "Frozen ground beef — what's the fastest thaw?",
      a: "Submerged in cold water in a sealed bag, about 30-45 min for a pound. Avoid hot water (uneven cook) and microwave thaw (often starts cooking the edges).",
    },
    {
      q: "How long does cooked ground beef keep?",
      a: "3-4 days in the fridge. Freeze in a flat bag for up to 3 months. Cooked beef in a freezer bag thaws fast and is dinner-ready.",
    },
    {
      q: "Should I drain the fat?",
      a: "For tacos, sloppy joes, and skillet pasta — yes, drain most of it. For pasta sauce simmered an hour — leave some, the fat carries flavor through the sauce.",
    },
    {
      q: "What if I only have ground turkey?",
      a: "Most recipes work the same — turkey is leaner, so add 1 tbsp oil and a touch more seasoning. The generator handles substitutions automatically if you list ground turkey in your pantry.",
    },
  ],
  related: [
    { href: "/pantry-to-dinner", label: "Pantry-to-dinner generator" },
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/dinner-ideas-pasta", label: "Pasta dinner ideas" },
    { href: "/cheap-family-dinners", label: "Cheap family dinners" },
    { href: "/quick-family-dinners-30-minutes", label: "Quick family dinners" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
