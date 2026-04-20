import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Kid-Friendly Dinner Ideas: Free Generator From Your Pantry | FamilyPlate",
  description:
    "Family dinners that work for kids without becoming chicken nuggets every night. Type your pantry, get 3 ideas tonight.",
  alternates: { canonical: "/kid-friendly-dinner-ideas" },
  openGraph: {
    title: "Kid-Friendly Dinner Ideas — From Your Pantry",
    description:
      "3 family dinners kids will eat, built around what's in your kitchen. Free.",
    type: "website",
    url: "/kid-friendly-dinner-ideas",
  },
};

const content: AeoContent = {
  slug: "kid-friendly-dinner-ideas",
  h1: "Kid-friendly dinner ideas (without giving up on real food)",
  subhead:
    "Type your pantry. Get 3 dinners that work for kids and adults — no separate \"kid plate\" required.",
  formDefaults: {
    placeholder: "e.g. chicken, ground beef, pasta, rice, cheese, tortillas, frozen veg",
    craving: "family-friendly, mild for kids but interesting for adults",
    buttonLabel: "Find kid-friendly dinners",
  },
  sections: [
    {
      h2: "The kid-friendly trap to avoid",
      body: [
        "Most \"kid-friendly\" dinner lists devolve into nuggets, mac and cheese, and pizza. Easy wins, but the kid never learns to like real food and the adults eat sad meals for years.",
        "The better approach: cook one good family dinner, but design it so kids can opt into or out of components. Sauce on the side. Veggies separate. The adventurous parts (peppers, herbs, hot sauce) added at the end.",
      ],
    },
    {
      h2: "Patterns that satisfy both groups",
      body: ["These structures work because everyone gets what they want from the same pan:"],
      bullets: [
        "Build-your-own bowls — rice or grain base, protein, vegetables, sauces, kids assemble what they like",
        "Taco / burrito night — tortillas, protein, toppings on the table",
        "Pasta with sauce on the side — kids eat buttered noodles, adults add sauce",
        "Sheet pan dinners — keep components separate on the pan, serve as a build-your-plate",
        "Breakfast for dinner — pancakes, eggs, sausage; universally beloved",
        "Pizza night — start with naan or tortilla bases, customize per person",
      ],
    },
    {
      h2: "Strategies that gradually expand the menu",
      body: [
        "Three small habits expand kid palates without battles. First: introduce one new ingredient inside something familiar (one new vegetable in pasta sauce). Second: serve the new thing alongside a known winner — they'll often try it after they're fed. Third: cook with them on weekends; kids eat what they helped make.",
        "The generator can suggest recipes that bridge — pasta with hidden vegetables, smoothies with vegetables, casseroles where the new thing isn't the star.",
      ],
    },
    {
      h2: "What to type for best kid-friendly results",
      body: [
        "List protein options the kids already accept — chicken, ground beef, pasta, eggs, cheese. Then add the broader ingredients you want to use up. The generator favors recipes that lean on the safe ingredients but stretch toward something more interesting.",
        "If you have specific food refusals to work around, mention them in the craving box (\"no spicy, no mushrooms\"). The generator will route around them.",
      ],
    },
  ],
  examples: [
    {
      name: "Build-Your-Own Taco Night",
      description:
        "The most flexible weeknight dinner. Adults assemble loaded tacos with all the toppings; kids do plain meat-and-cheese. Same prep, two happy crowds.",
      estimatedTime: 25,
      servings: 4,
      ingredients: [
        "1 lb ground beef or chicken",
        "1 onion, diced",
        "1 packet taco seasoning (or 2 tsp chili powder, 1 tsp cumin, 1 tsp paprika, 1/2 tsp garlic powder)",
        "8 small tortillas",
        "Toppings: shredded cheese, lettuce, tomato, salsa, sour cream, sliced avocado, lime, hot sauce",
      ],
      steps: [
        "Brown meat in a pan over medium-high, 5-6 min. Drain.",
        "Add onion, cook 3 min.",
        "Add seasoning and 1/4 cup water, simmer 3 min.",
        "Warm tortillas in a dry pan or microwave.",
        "Set out all toppings, let everyone build their own.",
        "Adults can add hot sauce; kids skip it.",
      ],
    },
    {
      name: "Hidden-Veggie Pasta Bake",
      description:
        "Kids see cheesy pasta, parents see two cups of vegetables blended into the sauce. Everyone eats, no negotiation needed.",
      estimatedTime: 35,
      servings: 6,
      ingredients: [
        "1 lb pasta (penne or shells)",
        "1 lb ground beef or turkey",
        "1 jar marinara sauce (24 oz)",
        "1 cup grated zucchini or carrot",
        "1 cup chopped spinach (frozen, thawed, squeezed dry)",
        "2 cups shredded mozzarella",
        "1/2 cup parmesan",
        "1 tsp oregano",
      ],
      steps: [
        "Preheat oven to 375°F. Boil pasta 2 min short of al dente, drain.",
        "Brown meat in a large pan, 5 min. Drain.",
        "Add zucchini and spinach, cook 3 min until softened.",
        "Add marinara and oregano, simmer 5 min.",
        "Toss with pasta in a baking dish.",
        "Top with mozz and parm. Bake 15 min until bubbly and golden.",
      ],
    },
  ],
  faq: [
    {
      q: "How do I get kids to eat new things?",
      a: "Three rules that mostly work: serve the new thing alongside a known favorite (not instead of), don't make a big deal about it, and offer it 8-10 times before deciding they don't like it. Kids' taste preferences shift constantly.",
    },
    {
      q: "Should I make separate kid meals?",
      a: "Generally no. Long-term, separate meals cement narrow eating. Better to cook one dinner and let kids skip components they don't want — they get exposed to the food without pressure.",
    },
    {
      q: "What ages does this work for?",
      a: "Toddlers through tweens, with adjustments. Toddlers want simple shapes and flavors; tweens are starting to develop preferences. The generator's mild defaults work across the age range.",
    },
    {
      q: "My kids only eat about 6 things — can this help?",
      a: "Yes. Type the 6 things they eat in the pantry box and the generator will find variations and combinations within those constraints. It's not magic, but it adds breadth without straying from what's safe.",
    },
  ],
  related: [
    { href: "/picky-eater-dinner-ideas", label: "Picky eater dinner ideas" },
    { href: "/quick-family-dinners-30-minutes", label: "Quick family dinners" },
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/dinner-ideas-pasta", label: "Pasta dinner ideas" },
    { href: "/pantry-to-dinner", label: "Full pantry-to-dinner generator" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
