"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import {
  UtensilsCrossed,
  ArrowRight,
  ShoppingCart,
  Sparkles,
  Shield,
  Users,
  Brain,
  ChefHat,
  Clock3,
  Heart,
  Mail,
  KeyRound,
  Loader2,
  CheckCircle2,
  Star,
  Leaf,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "../../convex/_generated/api";

type AuthMode = "magic-link" | "password-signin" | "password-signup";
const POST_AUTH_REDIRECT_KEY = "fp_post_auth_redirect";
const POST_AUTH_REDIRECT_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_POST_AUTH_REDIRECT = "/pantry";

const FEATURES = [
  {
    icon: Brain,
    title: "AI That Learns You",
    description: "Plans improve every week based on your ratings. Love stir fry? You'll see more. Hate casseroles? Gone.",
  },
  {
    icon: Shield,
    title: "Allergy Safe",
    description: "Server-side allergen enforcement catches what AI misses. Derivatives mapped for 10+ allergen categories.",
  },
  {
    icon: ShoppingCart,
    title: "Smart Grocery Lists",
    description: "One tap generates your shopping list. Automatically subtracts what's already in your pantry.",
  },
  {
    icon: Users,
    title: "Built for Families",
    description: "Each member sets their own preferences, allergies, and dislikes. Everyone's needs are respected.",
  },
  {
    icon: ChefHat,
    title: "Tonight's Dinner",
    description: "No plan? No problem. Get 3 instant dinner ideas from what's already in your pantry.",
  },
  {
    icon: BookOpen,
    title: "Your Cookbook",
    description: "Save recipes you love. Build a personal collection that grows with your family's favorites.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Set Preferences", description: "Allergies, dislikes, dietary goals \u2014 tell us once.", icon: Heart },
  { step: "2", title: "Stock Your Pantry", description: "Add what you have. The AI uses it first.", icon: Leaf },
  { step: "3", title: "Generate Your Plan", description: "7 personalized dinners in seconds.", icon: Sparkles },
  { step: "4", title: "Cook & Rate", description: "Mark meals cooked. Rate them. The AI learns.", icon: Star },
];

function sanitizeReturnTo(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }
  return path;
}

function persistPostAuthRedirect(path: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const safePath = sanitizeReturnTo(path);
  if (!safePath) {
    window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return;
  }

  window.localStorage.setItem(
    POST_AUTH_REDIRECT_KEY,
    JSON.stringify({
      path: safePath,
      createdAt: Date.now(),
    })
  );
}

function readStoredPostAuthRedirect() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { path?: string; createdAt?: number };
    const safePath = sanitizeReturnTo(parsed.path ?? null);
    const createdAt = typeof parsed.createdAt === "number" ? parsed.createdAt : 0;
    if (!safePath || Date.now() - createdAt > POST_AUTH_REDIRECT_MAX_AGE_MS) {
      window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      return null;
    }
    return safePath;
  } catch {
    window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return null;
  }
}

function clearStoredPostAuthRedirect() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
}

function readRequestedReturnToFromWindow() {
  if (typeof window === "undefined") {
    return null;
  }
  return sanitizeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

export default function LandingPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authRef = useRef<HTMLDivElement>(null);
  const redirectStartedRef = useRef(false);
  const currentUser = useQuery(
    api.queries.profiles.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const [hasMounted, setHasMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("magic-link");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const requestedReturnTo = readRequestedReturnToFromWindow();
    if (requestedReturnTo) {
      persistPostAuthRedirect(requestedReturnTo);
    }
  }, []);

  useEffect(() => {
    if (
      !hasMounted ||
      isLoading ||
      !isAuthenticated ||
      currentUser === undefined ||
      typeof window === "undefined" ||
      redirectStartedRef.current
    ) {
      return;
    }

    const requestedReturnTo = readRequestedReturnToFromWindow();
    const redirectTarget =
      requestedReturnTo ??
      readStoredPostAuthRedirect() ??
      currentUser?.postAuthRedirectPath ??
      DEFAULT_POST_AUTH_REDIRECT;
    clearStoredPostAuthRedirect();
    redirectStartedRef.current = true;
    setIsRedirecting(true);
    window.location.replace(redirectTarget);
  }, [
    currentUser,
    hasMounted,
    isAuthenticated,
    isLoading,
  ]);

  const clearPasswordFeedback = () => {
    setError("");
    setResetLinkSent(false);
    setShowCreateAccountPrompt(false);
  };

  const switchPasswordMode = (mode: Extract<AuthMode, "password-signin" | "password-signup">) => {
    setAuthMode(mode);
    setForgotPassword(false);
    clearPasswordFeedback();
  };

  const switchToMagicLink = () => {
    setAuthMode("magic-link");
    setForgotPassword(false);
    clearPasswordFeedback();
  };

  const openForgotPassword = () => {
    setForgotPassword(true);
    clearPasswordFeedback();
  };

  const closeForgotPassword = () => {
    setForgotPassword(false);
    clearPasswordFeedback();
  };

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startSignupFlow = () => {
    switchPasswordMode("password-signup");
    scrollToAuth();
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError("");
    try {
      const requestedReturnTo = readRequestedReturnToFromWindow();
      if (requestedReturnTo) {
        persistPostAuthRedirect(requestedReturnTo);
      }
      await signIn("resend", { email });
      setMagicLinkSent(true);
    } catch (err) {
      console.error("Magic link failed:", err);
      setError("Unable to send magic link. Please try again or use password sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    clearPasswordFeedback();
    try {
      const requestedReturnTo = readRequestedReturnToFromWindow();
      const redirectTarget =
        requestedReturnTo ??
        readStoredPostAuthRedirect() ??
        (authMode === "password-signup" ? "/setup/household" : "/plan");
      await signIn("password", {
        email,
        password,
        flow: authMode === "password-signup" ? "signUp" : "signIn",
      });
    } catch (err) {
      console.error("Auth failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      const hasInvalidCredentials =
        lower.includes("invalid") || lower.includes("credentials");
      if (authMode === "password-signup") {
        setError(lower.includes("already") || lower.includes("server error")
          ? "An account with this email may already exist. Try signing in instead."
          : `Could not create account: ${message}`);
      } else {
        if (hasInvalidCredentials) {
          setShowCreateAccountPrompt(true);
          setError("We couldn't sign you in with that email and password. New here? Create an account first.");
        } else {
          setError(lower.includes("server error")
            ? "Could not sign in right now. Please try again."
            : "Could not sign in. Please try again.");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    clearPasswordFeedback();
    try {
      await signIn("password", {
        email,
        flow: "reset",
      });
      setResetLinkSent(true);
    } catch (err) {
      console.error("Password reset failed:", err);
      setError("Unable to send reset link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keep the shell hidden until auth settles so logged-in users never see the landing page.
  if (
    !hasMounted ||
    isLoading ||
    isRedirecting ||
    isAuthenticated
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b nav-glass">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">FamilyPlate</span>
          </div>
          <Button size="sm" onClick={scrollToAuth} className="gap-1.5 rounded-xl">
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden hero-bg">
        <div className="absolute inset-0 hero-dots opacity-40" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-8 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered meal planning
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.08] mb-6 animate-fade-in-up">
              Dinner planning that{" "}
              <span className="gradient-text">actually knows</span>{" "}
              your family
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Personalized weekly dinners based on your pantry, preferences, and past favorites.
              Less food waste. Less stress. More meals everyone loves.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <Button size="lg" onClick={scrollToAuth} className="gap-2 text-base px-8 h-13 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                Start Planning Free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">No credit card required</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mt-16 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            {[
              { value: "7", label: "Dinners per plan" },
              { value: "3", label: "Swap options" },
              { value: "10s", label: "To generate" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Screenshots with phone frames */}
      <section className="py-20 relative">
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-3">See it in action</h2>
            <p className="text-sm text-muted-foreground text-center mb-12 max-w-md mx-auto">
              A beautiful, intuitive interface designed for busy families.
            </p>
          </RevealSection>
          <RevealSection>
            <div className="grid grid-cols-3 gap-4 sm:gap-10 max-w-3xl mx-auto items-end">
              <div className="text-center">
                <div className="phone-frame mb-4">
                  <img src="/mockup-plan.png" alt="Weekly meal plan view" className="w-full h-auto block" loading="lazy" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">Weekly Plan</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">7 personalized dinners</p>
              </div>
              <div className="text-center -mt-4 sm:-mt-8">
                <div className="phone-frame mb-4 scale-105 sm:scale-110">
                  <img src="/mockup-pantry.png" alt="Pantry tracking view" className="w-full h-auto block" loading="lazy" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">Smart Pantry</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Track what you have</p>
              </div>
              <div className="text-center">
                <div className="phone-frame mb-4">
                  <img src="/mockup-tonight.png" alt="Tonight's dinner suggestions" className="w-full h-auto block" loading="lazy" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">Tonight&apos;s Dinner</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">3 instant ideas</p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-6 border-y bg-muted/20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { icon: Shield, text: "Data encrypted" },
              { icon: CheckCircle2, text: "Free to start" },
              { icon: Clock3, text: "Cancel anytime" },
              { icon: Users, text: "Family-safe" },
            ].map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12">How it works</h2>
          </RevealSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <RevealSection key={item.step}>
                  <div className="relative text-center step-connector" style={{ transitionDelay: `${i * 0.1}s` }}>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mb-2 shadow-sm">
                      {item.step}
                    </div>
                    <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </RevealSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-3">Everything your family needs</h2>
            <p className="text-sm text-muted-foreground text-center mb-12 max-w-md mx-auto">
              Built from scratch for real families with real dietary needs, busy schedules, and picky eaters.
            </p>
          </RevealSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <RevealSection key={feature.title}>
                  <Card className="border shadow-sm bg-card feature-card h-full" style={{ transitionDelay: `${i * 0.05}s` }}>
                    <CardContent className="p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 mb-4">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1.5 font-body">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </RevealSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-3">Simple, honest pricing</h2>
            <p className="text-sm text-muted-foreground text-center mb-12 max-w-md mx-auto">
              Start free. Upgrade when your family wants the full experience.
            </p>
          </RevealSection>
          <RevealSection>
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Free tier */}
              <Card className="border-2 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-body">Free</CardTitle>
                  <CardDescription>Get started with the basics</CardDescription>
                  <div className="pt-2">
                    <span className="text-4xl font-bold font-body">$0</span>
                    <span className="text-sm text-muted-foreground ml-1">forever</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full rounded-xl" onClick={scrollToAuth}>
                    Get Started Free
                  </Button>
                  <ul className="space-y-2.5 pt-2">
                    {[
                      "2 meal plans per month",
                      "2 household members",
                      "Tonight\u2019s Dinner suggestions",
                      "AI grocery lists",
                      "Pantry tracking",
                      "5 saved cookbook recipes",
                      "Dark mode",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Family tier */}
              <Card className="border-2 border-primary relative pricing-glow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full shadow-md">Most Popular</span>
                </div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-body">Family</CardTitle>
                  <CardDescription>Everything for the whole household</CardDescription>
                  <div className="pt-2">
                    <span className="text-4xl font-bold font-body">$5.99</span>
                    <span className="text-sm text-muted-foreground ml-1">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">or $49/year <span className="text-primary font-semibold">(save 32%)</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full rounded-xl shadow-sm" onClick={startSignupFlow}>
                    Create Account to Upgrade
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl" onClick={startSignupFlow}>
                    Create Account for Annual
                  </Button>
                  <ul className="space-y-2.5 pt-2">
                    {[
                      "Unlimited meal plans",
                      "Unlimited household members",
                      "Tonight\u2019s Dinner suggestions",
                      "AI grocery lists",
                      "Pantry tracking + expiration alerts",
                      "Unlimited cookbook saves",
                      "Nutrition info per recipe",
                      "AI learns from your feedback",
                      "Share meal plans",
                      "Dark mode",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10">What families are saying</h2>
          </RevealSection>
          <RevealSection>
            <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                {
                  text: "Finally an app that actually respects my kid\u2019s peanut allergy. Not just in the recipes \u2014 in the ingredients too.",
                  name: "Sarah M.",
                  role: "Mom of 3",
                },
                {
                  text: "I used to throw out half my groceries. Now the app plans around what I already have. Game changer.",
                  name: "Mike T.",
                  role: "Home cook",
                },
                {
                  text: "The \u2018Tonight\u2019s Dinner\u2019 feature saved us when we forgot to thaw anything. 3 ideas in seconds.",
                  name: "Priya K.",
                  role: "Working parent",
                },
              ].map((testimonial) => (
                <Card key={testimonial.name} className="border shadow-sm testimonial-card text-left">
                  <CardContent className="p-6 pt-8">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed mb-5">
                      {testimonial.text}
                    </p>
                    <div>
                      <p className="text-sm font-semibold">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-2xl px-6">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12">Frequently asked questions</h2>
          </RevealSection>
          <div className="space-y-3">
            {[
              {
                q: "How is this different from just asking ChatGPT?",
                a: "FamilyPlate remembers your pantry, allergies, dislikes, and past ratings. It learns what your family actually likes and plans around what you already have. ChatGPT starts from scratch every time.",
              },
              {
                q: "Is it safe for food allergies?",
                a: "Yes. We have server-side allergen enforcement that catches violations even when the AI misses them. We map 10+ allergen categories to 100+ derivative ingredients.",
              },
              {
                q: "Can my whole family use it?",
                a: "Absolutely. Each family member gets their own profile with dietary preferences, allergies, and dislikes. The AI respects everyone's needs when generating plans.",
              },
              {
                q: "What if I don't like a suggested meal?",
                a: "Tap the swap button to get alternatives, or save recipes you love to your cookbook. Rate meals after cooking them \u2014 the AI learns and improves each week.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. No contracts, no commitments. Cancel your Family plan whenever you want and keep using the free tier.",
              },
              {
                q: "Does it work offline?",
                a: "FamilyPlate is a PWA. Previously loaded pages and recipes are cached for offline viewing. New plan generation requires an internet connection.",
              },
            ].map((faq, i) => (
              <RevealSection key={faq.q}>
                <Card className="border shadow-sm" style={{ transitionDelay: `${i * 0.04}s` }}>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-2 font-body">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Auth */}
      <section ref={authRef} className="py-20 relative">
        <div className="absolute inset-0 hero-bg opacity-50" />
        <div className="relative mx-auto max-w-sm px-6">
          <RevealSection>
            <div className="text-center mb-8">
              <div className="relative inline-block mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <UtensilsCrossed className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Start planning tonight</h2>
              <p className="text-sm text-muted-foreground">Free to try. No credit card needed.</p>
            </div>
          </RevealSection>

          <RevealSection>
            <Card className="border-0 shadow-xl shadow-foreground/5">
              <CardContent className="p-6">
                {magicLinkSent ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <CheckCircle2 className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold mb-1 font-body">Check your email</h3>
                      <p className="text-sm text-muted-foreground max-w-[240px]">
                        We sent a sign-in link to <strong>{email}</strong>. Click it to get started.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setMagicLinkSent(false); setEmail(""); }} className="text-xs">
                      Use a different email
                    </Button>
                  </div>
                ) : authMode === "magic-link" ? (
                  <>
                    <form onSubmit={handleMagicLink} className="space-y-4">
                      {error && (
                        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm animate-scale-in">{error}</div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
                      </div>
                      <Button type="submit" className="w-full h-12 text-base rounded-xl gap-2 shadow-sm" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        {isSubmitting ? "Sending link..." : "Send Magic Link"}
                      </Button>
                    </form>
                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" className="w-full h-11 rounded-xl gap-2" onClick={() => switchPasswordMode("password-signin")}>
                        <KeyRound className="h-4 w-4" />
                        Sign in
                      </Button>
                      <Button className="w-full h-11 rounded-xl gap-2" onClick={() => switchPasswordMode("password-signup")}>
                        <ArrowRight className="h-4 w-4" />
                        Create account
                      </Button>
                    </div>
                  </>
                ) : forgotPassword ? (
                  <>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      {error && (
                        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm animate-scale-in">{error}</div>
                      )}
                      {resetLinkSent && (
                        <div className="p-3 rounded-xl bg-primary/10 text-sm text-primary animate-scale-in">
                          Check your email for a reset link
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="email-reset">Email</Label>
                        <Input
                          id="email-reset"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            clearPasswordFeedback();
                          }}
                          required
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <Button type="submit" className="w-full h-12 text-base rounded-xl gap-2 shadow-sm" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        {isSubmitting ? "Sending reset link..." : "Send Reset Link"}
                      </Button>
                    </form>
                    <div className="flex flex-col gap-2 mt-4">
                      <button
                        type="button"
                        onClick={closeForgotPassword}
                        className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Back to sign in
                      </button>
                      <button
                        type="button"
                        onClick={switchToMagicLink}
                        className="text-center text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                      >
                        Back to magic link
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <form onSubmit={handlePassword} className="space-y-4">
                      {error && (
                        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm animate-scale-in">{error}</div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="email-pw">Email</Label>
                        <Input
                          id="email-pw"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            clearPasswordFeedback();
                          }}
                          required
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clearPasswordFeedback();
                          }}
                          required
                          minLength={8}
                          className="h-12 rounded-xl"
                        />
                      </div>
                      {authMode === "password-signin" && (
                        <button
                          type="button"
                          onClick={openForgotPassword}
                          className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                      <Button type="submit" className="w-full h-12 text-base rounded-xl gap-2 shadow-sm" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {isSubmitting
                          ? authMode === "password-signup" ? "Creating account..." : "Signing in..."
                          : authMode === "password-signup" ? "Create Account" : "Sign In"}
                      </Button>
                    </form>
                    <div className="flex flex-col gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => switchPasswordMode(authMode === "password-signup" ? "password-signin" : "password-signup")}
                        className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {authMode === "password-signup" ? "Already have an account? Sign in" : "New here? Create account"}
                      </button>
                      <button
                        type="button"
                        onClick={switchToMagicLink}
                        className="text-center text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                      >
                        ← Back to magic link
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </RevealSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <UtensilsCrossed className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">FamilyPlate</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 FamilyPlate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
