import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Pasta Dinner Ideas: Free Generator From Your Pantry | FamilyPlate",
  description:
    "Got pasta and not much else? Type your pantry items, get 3 pasta dinner ideas tonight — no boring jarred-sauce-only recipes.",
  alternates: { canonical: "/dinner-ideas-pasta" },
  openGraph: {
    title: "Pasta Dinner Ideas — From Your Pantry",
    description:
      "3 pasta dinners tonight from what's already in your kitchen. Free.",
    type: "website",
    url: "/dinner-ideas-pasta",
  },
};

const content: AeoContent = {
  slug: "dinner-ideas-pasta",
  h1: "Pasta dinner ideas, beyond jarred sauce",
  subhead:
    "Pasta in the pantry? Tell the generator what else you've got. Get 3 dinners tonight — none of them \"boil pasta, dump jar, eat.\"",
  formDefaults: {
    pantry: "pasta",
    placeholder: "pasta, plus what else? canned tomatoes, garlic, parm, eggs, bacon, frozen peas...",
    buttonLabel: "Find pasta dinners",
  },
  sections: [
    {
      h2: "Why pasta is the perfect pantry meal",
      body: [
        "Pasta cooks in 8-12 minutes, costs $0.30 per serving, and pairs with anything. The only reason it gets boring is everyone defaults to jarred sauce on plain noodles.",
        "Real pasta dinners use what you have. A few cloves of garlic and olive oil makes aglio e olio. Bacon and an egg makes carbonara. A can of tomatoes and onion makes pomodoro. Each costs less than $5 to feed four people.",
      ],
    },
    {
      h2: "Pasta techniques worth knowing",
      body: ["Three small habits make pasta dinners much better:"],
      bullets: [
        "Salt the water like the sea (1-2 tbsp per pot) — this is most of the pasta's seasoning",
        "Reserve 1 cup pasta water before draining — the starchy water binds sauce to noodles",
        "Finish pasta in the sauce, not on top of it — toss in the pan for 1-2 minutes so it actually absorbs flavor",
      ],
    },
    {
      h2: "Sauce patterns that need nothing fancy",
      body: ["Each of these uses 5-7 ingredients, most already in your pantry:"],
      bullets: [
        "Aglio e olio — garlic, olive oil, red pepper flakes, parsley, parmesan",
        "Cacio e pepe — pasta water, parmesan, butter, black pepper",
        "Carbonara — egg yolks, parmesan, bacon, black pepper, pasta water",
        "Pomodoro — canned tomatoes, garlic, basil, olive oil",
        "Brown butter sage — butter, sage leaves, parmesan, lemon",
        "Pesto — basil, pine nuts (or walnuts), garlic, parm, olive oil",
        "Lemon cream — heavy cream or half-and-half, lemon, parm, peas",
      ],
    },
    {
      h2: "Pasta shapes — does it matter?",
      body: [
        "It does for technique, less for flavor. Long pasta (spaghetti, linguine) wants oil-based or thin sauces that coat. Short pasta (penne, rigatoni, shells) catches chunky sauces and bakes well. Tubes (ziti) work for casseroles. The generator picks recipes that match what you have.",
        "If you only have one shape, it'll still work. Just pick a sauce that suits it — chunky meat sauce on long pasta is harder to eat than chunky meat sauce on shells.",
      ],
    },
  ],
  examples: [
    {
      name: "10-Minute Garlic Olive Oil Spaghetti",
      description:
        "The dinner you make when there's nothing in the house. Five ingredients, 10 minutes, restaurant quality.",
      estimatedTime: 15,
      servings: 4,
      ingredients: [
        "1 lb spaghetti",
        "6 cloves garlic, thinly sliced",
        "1/2 cup olive oil",
        "1/2 tsp red pepper flakes",
        "1/2 cup grated parmesan",
        "Salt, fresh parsley if you have it",
      ],
      steps: [
        "Boil spaghetti in heavily salted water until 1 min short of al dente. Reserve 1 cup pasta water.",
        "Meanwhile, heat olive oil in a large pan over medium-low.",
        "Add garlic and red pepper flakes. Cook 3-4 min, gently, until garlic is just golden — DO NOT brown.",
        "Add drained pasta to the pan with 1/2 cup pasta water. Toss 1-2 min.",
        "Off heat, toss with parmesan. Add more pasta water if dry.",
        "Serve immediately, with parsley if you have it.",
      ],
    },
    {
      name: "Pantry Tomato Pasta with Pancetta",
      description:
        "30 minutes, mostly hands-off. Crispy pancetta or bacon, garlic, canned tomatoes, basil. Tastes like a 2-hour ragu.",
      estimatedTime: 30,
      servings: 4,
      ingredients: [
        "1 lb rigatoni or penne",
        "4 oz pancetta or bacon, diced",
        "1 onion, diced",
        "4 cloves garlic, minced",
        "1 can (28 oz) crushed tomatoes",
        "1 tsp dried oregano, pinch sugar",
        "Parmesan, basil, salt, pepper",
      ],
      steps: [
        "Crisp pancetta in a deep pan over medium heat, 6 min. Remove with a spoon.",
        "Add onion to the pan, cook in pancetta fat 5 min. Add garlic, 30 sec.",
        "Add tomatoes, oregano, sugar, salt, pepper. Simmer 15 min.",
        "Boil pasta in salted water until al dente. Reserve 1 cup pasta water.",
        "Add pasta to sauce with a splash of pasta water. Toss 1-2 min.",
        "Top with pancetta, parm, torn basil. Serve.",
      ],
    },
  ],
  faq: [
    {
      q: "Fresh vs dried pasta — does it matter?",
      a: "Not really for weeknight dinners. Dried pasta is cheaper, lasts forever, and works for almost everything. Fresh pasta is for special-occasion sauces (butter, cream) where its tender texture matters.",
    },
    {
      q: "How much pasta per person?",
      a: "About 2 oz dried per person for a side, 4 oz for a main. A 1 lb box feeds 4 adults as a main course.",
    },
    {
      q: "Can I make pasta ahead?",
      a: "Cook it 1-2 minutes short of al dente, drain, toss with a little oil, refrigerate. Reheat by tossing in hot sauce — it'll finish cooking. Don't pre-cook fully or it gets gummy.",
    },
    {
      q: "What if I'm gluten-free?",
      a: "Tag wheat/gluten on the form. The generator will route to gluten-free pasta options or skip pasta entirely and propose grain bowls or rice dishes instead.",
    },
  ],
  related: [
    { href: "/pantry-to-dinner", label: "Full pantry-to-dinner generator" },
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/dinner-ideas-ground-beef", label: "Ground beef dinner ideas" },
    { href: "/quick-family-dinners-30-minutes", label: "Quick family dinners" },
    { href: "/picky-eater-dinner-ideas", label: "Picky eater dinner ideas" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
