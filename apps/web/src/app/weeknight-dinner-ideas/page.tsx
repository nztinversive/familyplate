import type { Metadata } from "next";
import { AeoLandingPage, type AeoContent } from "@/components/aeo/AeoLandingPage";

export const metadata: Metadata = {
  title: "Weeknight Dinner Ideas: Free Generator From Your Pantry | FamilyPlate",
  description:
    "Tired of the same five rotation? Type your pantry, get 3 fresh weeknight dinner ideas — built around what you already have, not what you'd have to shop for.",
  alternates: { canonical: "/weeknight-dinner-ideas" },
  openGraph: {
    title: "Weeknight Dinner Ideas — From Your Pantry",
    description:
      "3 weeknight dinners from what's already in your kitchen. Free, no signup.",
    type: "website",
    url: "/weeknight-dinner-ideas",
  },
};

const content: AeoContent = {
  slug: "weeknight-dinner-ideas",
  h1: "Weeknight dinner ideas, without the rut",
  subhead:
    "Stuck in a five-meal rotation? Type your pantry. Get 3 fresh dinners — none of them what you cooked Tuesday.",
  formDefaults: {
    placeholder: "e.g. ground turkey, pasta, canned tomatoes, frozen broccoli, parm, garlic",
    buttonLabel: "Find weeknight dinners",
  },
  sections: [
    {
      h2: "Why weeknight dinners get repetitive",
      body: [
        "It's not lack of recipes — there are millions online. It's the cognitive load of choosing one that uses what you actually have. So the brain reaches for the five things it can cook on autopilot. Tacos. Spaghetti. Grilled cheese. Repeat.",
        "A pantry-first generator removes the choosing tax. You list what you have, three options appear, you pick one. The decision takes 20 seconds, the rotation breaks.",
      ],
    },
    {
      h2: "What makes a recipe \"weeknight friendly\"",
      body: ["Not all recipes are equal on a Tuesday at 6:15pm. The ones that work share a few traits:"],
      bullets: [
        "Under 45 minutes total time (most under 30)",
        "One pan, two pans max — no stack of dishes after",
        "Forgives interruptions (kids, calls, the dog) — no last-second sauce emulsions",
        "Uses ingredients that are usually on hand, not specialty",
        "Scales easily — same recipe for 2, 4, or 6",
        "Leftovers that hold up to lunch the next day",
      ],
    },
    {
      h2: "Rotating proteins keeps things fresh",
      body: [
        "If every weeknight is chicken, every weeknight tastes like chicken. Easy upgrade: rotate proteins across the week. Chicken Monday, ground beef Tuesday, eggs Wednesday, fish Thursday, pasta or beans Friday.",
        "The generator naturally varies — when you list \"chicken, ground beef, eggs, beans\" all in your pantry, the three suggestions tend to spread across them rather than all leaning on one.",
      ],
    },
    {
      h2: "Building a deep weeknight pantry",
      body: ["Stock these and the generator can produce dinner ideas indefinitely without repeats:"],
      bullets: [
        "3-4 proteins on rotation (chicken, ground beef, eggs, canned beans)",
        "3 carb bases (rice, pasta, tortillas)",
        "5-6 frozen vegetables (broccoli, peas, corn, spinach, mixed)",
        "Aromatics (onion, garlic, ginger)",
        "Acid (lemon, lime, vinegar)",
        "Pantry sauces (soy, fish sauce, hot sauce, mustard)",
        "Cheese (parm, cheddar, feta — small amounts go far)",
      ],
    },
  ],
  examples: [
    {
      name: "Honey Garlic Chicken Bowls",
      description:
        "Sticky-sweet glazed chicken over rice with whatever vegetable you've got. Tastes like takeout, costs less than $4/serving.",
      estimatedTime: 25,
      servings: 4,
      ingredients: [
        "1.5 lbs chicken thighs, cubed",
        "1/4 cup soy sauce",
        "3 tbsp honey",
        "4 cloves garlic, minced",
        "1 tbsp rice vinegar (or lemon juice)",
        "1 tbsp neutral oil",
        "2 cups cooked rice",
        "2 cups frozen broccoli or any vegetable",
      ],
      steps: [
        "Cook rice. Steam or sauté broccoli.",
        "Whisk soy, honey, garlic, vinegar in a bowl.",
        "Heat oil in a large pan over medium-high. Add chicken, sear 6 min until browned.",
        "Pour sauce over chicken, simmer 3-4 min until thick and glossy.",
        "Build bowls: rice, broccoli, chicken with sauce.",
      ],
    },
    {
      name: "Black Bean Quesadillas with Smoky Sauce",
      description:
        "20 minutes, $2/serving, vegetarian. Crispy quesadillas with seasoned beans, melty cheese, and a quick chipotle-lime sour cream.",
      estimatedTime: 20,
      servings: 4,
      ingredients: [
        "1 can black beans, drained",
        "1 tsp cumin, 1 tsp chili powder, 1/2 tsp salt",
        "8 flour tortillas",
        "2 cups shredded cheese (cheddar or jack)",
        "1/2 cup sour cream",
        "1 tbsp lime juice",
        "1 tsp chipotle powder or hot sauce",
        "Butter or oil for the pan",
      ],
      steps: [
        "Mash beans with cumin, chili powder, salt in a bowl.",
        "Mix sour cream, lime, chipotle in another bowl. Set aside.",
        "Heat a pan over medium. Butter one side of a tortilla, place butter-down.",
        "Spread bean mixture, sprinkle cheese, top with another buttered tortilla.",
        "Cook 2-3 min per side until golden and melted.",
        "Slice into wedges, serve with the sauce.",
      ],
    },
  ],
  faq: [
    {
      q: "How do I escape the same-five-meals trap?",
      a: "Two things: deepen your pantry past the same six ingredients, and use a generator to surface dinners you wouldn't have thought of with what you have. The combination breaks the rut faster than browsing recipe sites.",
    },
    {
      q: "How long should weeknight dinners take?",
      a: "20-40 minutes total is the sweet spot. Faster than that and you sacrifice variety. Longer and the kids start melting down before you serve.",
    },
    {
      q: "Can I plan a whole week at once?",
      a: "The free generator does one dinner at a time. Sign up for the full app and it builds a 7-dinner weekly plan from your pantry, learns what your family liked last week, and generates the grocery list for whatever's missing.",
    },
    {
      q: "What if my partner and kids want different things?",
      a: "Tag allergies for serious restrictions. For preference clashes, build a base recipe that lets people add or skip components — taco bar, rice bowls, pasta with sauce on the side.",
    },
  ],
  related: [
    { href: "/pantry-to-dinner", label: "Pantry-to-dinner generator" },
    { href: "/quick-family-dinners-30-minutes", label: "30-minute family dinners" },
    { href: "/picky-eater-dinner-ideas", label: "Picky eater dinner ideas" },
    { href: "/dinner-ideas-chicken", label: "Chicken dinner ideas" },
    { href: "/cheap-family-dinners", label: "Cheap family dinners" },
  ],
};

export default function Page() {
  return <AeoLandingPage content={content} />;
}
