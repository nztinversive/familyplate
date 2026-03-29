"use client";

import { useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import {
  UtensilsCrossed,
  ArrowRight,
  CalendarDays,
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
  Moon,
  Sun,
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

type AuthMode = "magic-link" | "password-signin" | "password-signup";

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
  { step: "3", title: "Generate Your Plan", description: "7 personalized dinners with nutrition info.", icon: Sparkles },
  { step: "4", title: "Cook & Rate", description: "Mark meals cooked. Rate them. The AI learns.", icon: Star },
];

export default function LandingPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("magic-link");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  if ((isAuthenticated && !isLoading) || isRedirecting) {
    if (!isRedirecting && typeof window !== "undefined") {
      window.location.href = "/pantry";
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError("");
    try {
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
    setError("");
    try {
      await signIn("password", {
        email,
        password,
        flow: authMode === "password-signup" ? "signUp" : "signIn",
      });
      setIsRedirecting(true);
      window.location.href = "/pantry";
    } catch (err) {
      console.error("Auth failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      if (authMode === "password-signup") {
        setError(lower.includes("already") || lower.includes("server error")
          ? "An account with this email may already exist. Try signing in instead."
          : `Could not create account: ${message}`);
      } else {
        setError(lower.includes("invalid") || lower.includes("credentials") || lower.includes("server error")
          ? "Invalid email or password."
          : "Could not sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">FamilyPlate</span>
          </div>
          <Button size="sm" onClick={scrollToAuth} className="gap-1.5">
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered meal planning
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              Dinner planning that{" "}
              <span className="text-primary">actually knows</span>{" "}
              your family
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
              Personalized weekly dinners based on your pantry, preferences, and past favorites.
              Less food waste. Less stress. More meals everyone loves.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={scrollToAuth} className="gap-2 text-base px-8 h-12 rounded-xl">
                Start Planning Free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">No credit card required</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-14">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">7</p>
              <p className="text-xs text-muted-foreground mt-0.5">Dinners per plan</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">3</p>
              <p className="text-xs text-muted-foreground mt-0.5">Options per night</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">10s</p>
              <p className="text-xs text-muted-foreground mt-0.5">To generate</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Screenshots */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-3">See it in action</h2>
          <p className="text-sm text-muted-foreground text-center mb-10 max-w-md mx-auto">
            A beautiful, intuitive interface designed for busy families.
          </p>
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="rounded-2xl overflow-hidden shadow-xl shadow-foreground/10 border mb-3">
                <img src="/mockup-plan.png" alt="Weekly meal plan view" className="w-full h-auto" loading="lazy" />
              </div>
              <p className="text-xs font-medium">Weekly Plan</p>
            </div>
            <div className="text-center">
              <div className="rounded-2xl overflow-hidden shadow-xl shadow-foreground/10 border mb-3">
                <img src="/mockup-pantry.png" alt="Pantry tracking view" className="w-full h-auto" loading="lazy" />
              </div>
              <p className="text-xs font-medium">Smart Pantry</p>
            </div>
            <div className="text-center">
              <div className="rounded-2xl overflow-hidden shadow-xl shadow-foreground/10 border mb-3">
                <img src="/mockup-tonight.png" alt="Tonight's dinner suggestions" className="w-full h-auto" loading="lazy" />
              </div>
              <p className="text-xs font-medium">Tonight&apos;s Dinner</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-8 border-y bg-muted/20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Data encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Family-safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-10">How it works</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-3">Everything your family needs</h2>
          <p className="text-sm text-muted-foreground text-center mb-10 max-w-md mx-auto">
            Built from scratch for real families with real dietary needs, busy schedules, and picky eaters.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-0 shadow-sm bg-card">
                  <CardContent className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-3">Simple, honest pricing</h2>
          <p className="text-sm text-muted-foreground text-center mb-10 max-w-md mx-auto">
            Start free. Upgrade when your family wants the full experience.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Free tier */}
            <Card className="border-2 border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Free</CardTitle>
                <CardDescription>Get started with the basics</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">$0</span>
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
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Family</CardTitle>
                <CardDescription>Everything for the whole household</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">$5.99</span>
                  <span className="text-sm text-muted-foreground ml-1">/month</span>
                </div>
                <p className="text-xs text-muted-foreground">or $49/year <span className="text-primary font-medium">(save 32%)</span></p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full rounded-xl" onClick={scrollToAuth}>
                  Start Free Trial
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
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-8">What families are saying</h2>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex gap-0.5 mb-3 justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-3">
                  &ldquo;Finally an app that actually respects my kid&apos;s peanut allergy. Not just in the recipes &mdash; in the ingredients too.&rdquo;
                </p>
                <p className="text-xs font-medium">Sarah M.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex gap-0.5 mb-3 justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-3">
                  &ldquo;I used to throw out half my groceries. Now the app plans around what I already have. Game changer.&rdquo;
                </p>
                <p className="text-xs font-medium">Mike T.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex gap-0.5 mb-3 justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-3">
                  &ldquo;The &lsquo;Tonight&rsquo;s Dinner&rsquo; feature saved us when we forgot to thaw anything. 3 ideas in seconds.&rdquo;
                </p>
                <p className="text-xs font-medium">Priya K.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "How is this different from just asking ChatGPT?",
                a: "FamilyPlate remembers your pantry, allergies, dislikes, and past ratings. It learns what your family actually likes and plans around what you already have. ChatGPT starts from scratch every time.",
              },
              {
                q: "Is it safe for food allergies?",
                a: "Yes. We have server-side allergen enforcement that catches violations even when the AI misses them. We map 10+ allergen categories to 100+ derivative ingredients (e.g. 'milk' catches cream, butter, whey, casein, etc).",
              },
              {
                q: "Can my whole family use it?",
                a: "Absolutely. Each family member gets their own profile with dietary preferences, allergies, and dislikes. The AI respects everyone's needs when generating plans. Invite members via email.",
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
                a: "FamilyPlate is a PWA (Progressive Web App). Previously loaded pages and recipes are cached for offline viewing. New plan generation requires an internet connection.",
              },
            ].map((faq) => (
              <Card key={faq.q} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Auth */}
      <section ref={authRef} className="py-16">
        <div className="mx-auto max-w-sm px-6">
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <UtensilsCrossed className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Start planning tonight</h2>
            <p className="text-sm text-muted-foreground">Free to try. No credit card needed.</p>
          </div>

          <Card className="border-0 shadow-xl shadow-foreground/5">
            <CardContent className="p-6">
              {magicLinkSent ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <CheckCircle2 className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">Check your email</h3>
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
                      <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base rounded-xl gap-2" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {isSubmitting ? "Sending link..." : "Send Magic Link"}
                    </Button>
                  </form>
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                  </div>
                  <Button variant="outline" className="w-full h-11 rounded-xl gap-2" onClick={() => { setAuthMode("password-signin"); setError(""); }}>
                    <KeyRound className="h-4 w-4" />
                    Sign in with password
                  </Button>
                </>
              ) : (
                <>
                  <form onSubmit={handlePassword} className="space-y-4">
                    {error && (
                      <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email-pw">Email</Label>
                      <Input id="email-pw" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-12 rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base rounded-xl gap-2" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      {isSubmitting
                        ? authMode === "password-signup" ? "Creating account..." : "Signing in..."
                        : authMode === "password-signup" ? "Create Account" : "Sign In"}
                    </Button>
                  </form>
                  <div className="flex flex-col gap-2 mt-4">
                    <button onClick={() => { setAuthMode(authMode === "password-signup" ? "password-signin" : "password-signup"); setError(""); }} className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {authMode === "password-signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                    </button>
                    <button onClick={() => { setAuthMode("magic-link"); setError(""); }} className="text-center text-xs text-muted-foreground/70 hover:text-foreground transition-colors">
                      ← Back to magic link
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
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
