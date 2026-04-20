import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Quick Family Dinners (30 Minutes or Less): Free Generator | FamilyPlate",
  description:
    "Need dinner on the table in 30 minutes? Type your pantry, get 3 fast family dinners — none over 30 minutes start to finish.",
  alternates: { canonical: "/quick-family-dinners-30-minutes" },
  openGraph: {
    title: "Quick Family Dinners — 30 Minutes or Less",
    description:
      "3 fast family dinners from your pantry, all under 30 minutes. Free.",
    type: "website",
    url: "/quick-family-dinners-30-minutes",
  },
};

const content: AeoContent = {
  slug: "quick-family-dinners-30-minutes",
  h1: "Quick family dinners in 30 minutes or less",
  subhead:
    "Type what's in your kitchen. Get 3 dinners — all under 30 minutes from \"open the fridge\" to \"plates on the table.\"",
  formDefaults: {
    placeholder: "e.g. chicken thighs, pasta, eggs, frozen veg, garlic, soy sauce",
    craving: "fast, under 30 minutes, minimal cleanup",
    buttonLabel: "Find quick dinners",
  },
  sections: [
    {
      h2: "What \"30 minutes\" actually means here",
      body: [
        "Real 30 minutes — start the clock when you walk in the kitchen. That includes prep, cooking, and getting it on plates. Not \"30 minutes after you've already chopped everything and preheated the oven.\"",
        "The generator caps suggestions at 30-minute total time when you tag the craving as fast. It also favors techniques that use one pan and produce minimal cleanup.",
      ],
    },
    {
      h2: "Techniques that beat the clock",
      body: ["The fastest dinners share a few patterns:"],
      bullets: [
        "Stir fry — high heat, thin-cut protein, prep while pasta or rice cooks",
        "Skillet pasta — pasta + sauce + protein in one pan, no separate boil",
        "Sheet pan with pre-cut ingredients — 25 min in the oven, hands off",
        "Eggs as the protein — frittata, fried rice, breakfast for dinner (10-15 min)",
        "Pre-cooked rotisserie chicken — quesadillas, salads, soup, pasta",
        "Pre-cooked rice or grains — heat in 2 min instead of 25",
      ],
    },
    {
      h2: "Stock the speed-pantry",
      body: ["These ingredients make weeknight cooking dramatically faster. Worth keeping on hand:"],
      bullets: [
        "Frozen vegetables — no chopping, no waste, often already prepped",
        "Pre-minced garlic in jars (compromise on flavor, win on time)",
        "Pre-cooked rice (microwave bags, leftover rice in freezer)",
        "Canned tomatoes / sauce — sauces in 10 min instead of 30",
        "Tortillas — quesadillas in 5 min, tacos in 15",
        "Eggs — fastest protein in the kitchen",
        "Pasta — 8-12 min cook time",
      ],
    },
    {
      h2: "What slows weeknight cooking down (and how to avoid it)",
      body: [
        "Three things blow up weeknight cook time more than recipes acknowledge: thawing frozen meat (use the microwave's defrost or thin-slice it frozen), preheating the oven (start it the moment you walk in), and chopping a lot of vegetables (use frozen, or do it on Sunday).",
        "The generator naturally avoids recipes with long cook times, but it can't avoid the prep you forgot to do. Tag \"no thawing time\" in the craving box if you forgot to take meat out.",
      ],
    },
  ],
  examples: [
    {
      name: "15-Minute Egg Fried Rice",
      description:
        "Leftover rice + eggs + frozen peas + soy. Fastest real dinner in the kitchen. Add any protein you have in 30 seconds.",
      estimatedTime: 15,
      servings: 4,
      ingredients: [
        "3 cups cold cooked rice (day old is best)",
        "4 eggs, beaten",
        "1 cup frozen peas and carrots",
        "3 tbsp soy sauce",
        "2 tbsp sesame oil",
        "3 cloves garlic, minced",
        "2 green onions, sliced (optional)",
      ],
      steps: [
        "Heat 1 tbsp sesame oil in a large pan over high heat. Pour in beaten eggs, scramble 1 min, remove.",
        "Heat remaining sesame oil in the same pan. Add garlic, cook 30 sec.",
        "Add frozen peas and carrots, cook 2 min.",
        "Add cold rice, breaking up clumps. Toss 3-4 min until heated through.",
        "Pour soy sauce over, toss. Return eggs to pan, fold in.",
        "Top with green onions, serve.",
      ],
    },
    {
      name: "20-Minute Skillet Chicken Fajitas",
      description:
        "One pan, weeknight standard. Sliced chicken, peppers, onions, fajita spice. Tortillas on the side.",
      estimatedTime: 20,
      servings: 4,
      ingredients: [
        "1 lb chicken breast or thigh, sliced thin",
        "2 bell peppers, sliced",
        "1 onion, sliced",
        "2 tbsp olive oil",
        "1 tbsp chili powder, 1 tsp cumin, 1 tsp paprika",
        "1/2 tsp garlic powder, salt, pepper",
        "8 small tortillas",
        "Lime, salsa, sour cream",
      ],
      steps: [
        "Toss chicken with all the spices and 1 tbsp oil.",
        "Heat remaining oil in a large skillet over high heat. Add chicken, cook 5-6 min until browned.",
        "Add peppers and onions, cook 5-7 min until softened with char.",
        "Squeeze lime over, toss.",
        "Warm tortillas in a dry pan or microwave.",
        "Serve from skillet with toppings.",
      ],
    },
  ],
  faq: [
    {
      q: "Is 30 minutes really enough for a homemade dinner?",
      a: "Yes — most weeknight dinners take 20-25 active minutes. The recipes that take \"30 minutes\" in cookbooks usually skip prep time. Generated recipes here include prep in the total.",
    },
    {
      q: "What's the absolute fastest dinner?",
      a: "Egg fried rice (15 min), grilled cheese with soup (10 min), or quesadillas with rotisserie chicken (10 min). All real dinners, all faster than ordering delivery.",
    },
    {
      q: "Can I prep ahead to make weeknights faster?",
      a: "The biggest wins: chop a week of onions on Sunday (3 days in the fridge in a bag), cook a pot of rice (5 days fridge, freezable), and roast a sheet pan of vegetables (3-4 days). Sign up for the full app to track meal prep against your pantry automatically.",
    },
    {
      q: "What if I have more than 30 minutes?",
      a: "Don't tag the speed craving. The generator will propose better recipes that take 35-50 minutes — sheet pan roasts, braises, slow-simmer pasta sauces.",
    },
  ],
  related: [
    { href: "/pantry-to-dinner", label: "Pantry-to-dinner generator" },
    { href: "/weeknight-dinner-ideas", label: "Weeknight dinner ideas" },
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/dinner-ideas-pasta", label: "Pasta dinner ideas" },
    { href: "/cheap-family-dinners", label: "Cheap family dinners" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
