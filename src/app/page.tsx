"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import {
  UtensilsCrossed,
  ArrowRight,
  CalendarDays,
  Mail,
  ShoppingCart,
  Sparkles,
  KeyRound,
  Loader2,
  CheckCircle2,
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

const FEATURES = [
  { icon: CalendarDays, label: "Plan", desc: "Weekly dinners" },
  { icon: ShoppingCart, label: "Shop", desc: "Smart lists" },
  { icon: Sparkles, label: "Discover", desc: "AI recipes" },
];

type AuthMode = "magic-link" | "password-signin" | "password-signup";

export default function WelcomePage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

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
      <div className="app-container min-h-screen flex items-center justify-center welcome-gradient">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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
        if (lower.includes("already") || lower.includes("server error")) {
          setError("An account with this email may already exist. Try signing in instead.");
        } else {
          setError(`Could not create account: ${message}`);
        }
      } else {
        if (lower.includes("invalid") || lower.includes("credentials") || lower.includes("server error")) {
          setError("Invalid email or password.");
        } else {
          setError("Could not sign in. Please try again.");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-container min-h-screen flex items-center justify-center welcome-gradient">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen flex flex-col items-center px-6 py-8 welcome-gradient overflow-y-auto">
      {/* Logo & branding */}
      <div className="flex flex-col items-center text-center mb-6 animate-fade-in-up">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-md">
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">FamilyPlate</h1>
        <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
          Smart dinner planning for your whole family. Less waste, more flavor.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex gap-2.5 mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-1 rounded-xl bg-card border px-3 py-2.5 shadow-sm"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold">{feature.label}</span>
              <span className="text-[9px] text-muted-foreground">{feature.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Auth card */}
      <Card className="w-full max-w-sm border-0 shadow-xl shadow-foreground/5 opacity-0 animate-fade-in-up flex-shrink-0" style={{ animationDelay: "0.3s" }}>
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg">
            {magicLinkSent
              ? "Check Your Email"
              : authMode === "password-signup"
                ? "Create Account"
                : "Welcome"}
          </CardTitle>
          <CardDescription>
            {magicLinkSent
              ? `We sent a sign-in link to ${email}`
              : authMode === "magic-link"
                ? "Sign in with a magic link — no password needed"
                : authMode === "password-signup"
                  ? "Create an account with email and password"
                  : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {magicLinkSent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                Click the link in your email to sign in. The link expires in 1 hour.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail("");
                }}
                className="text-xs"
              >
                Use a different email
              </Button>
            </div>
          ) : authMode === "magic-link" ? (
            <>
              <form onSubmit={handleMagicLink} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm animate-scale-in">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base rounded-xl gap-2"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Sending link..." : "Send Magic Link"}
                </Button>
              </form>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl gap-2"
                onClick={() => {
                  setAuthMode("password-signin");
                  setError("");
                }}
              >
                <KeyRound className="h-4 w-4" />
                Sign in with password
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={handlePassword} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm animate-scale-in">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email-pw">Email</Label>
                  <Input
                    id="email-pw"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-12 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base rounded-xl gap-2"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {isSubmitting
                    ? authMode === "password-signup" ? "Creating account..." : "Signing in..."
                    : authMode === "password-signup" ? "Create Account" : "Sign In"}
                </Button>
              </form>
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={() => {
                    setAuthMode(authMode === "password-signup" ? "password-signin" : "password-signup");
                    setError("");
                  }}
                  className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {authMode === "password-signup"
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </button>
                <button
                  onClick={() => {
                    setAuthMode("magic-link");
                    setError("");
                  }}
                  className="text-center text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  ← Back to magic link
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground/50 mt-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        FamilyPlate v0.1.0
      </p>
    </div>
  );
}
