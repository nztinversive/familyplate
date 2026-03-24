"use client";

import { useState } from "react";
import { UtensilsCrossed, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function WelcomePage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      // Store email + generate temp auth ID for pre-auth flow
      // TODO: Replace with real Convex Auth magic link when configured
      const authId = localStorage.getItem("fp_authId") || crypto.randomUUID();
      localStorage.setItem("fp_authId", authId);
      localStorage.setItem("fp_email", email);
      localStorage.setItem("fp_userName", email.split("@")[0]);
      window.location.href = "/setup/household";
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container min-h-screen flex flex-col items-center justify-center px-6">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <UtensilsCrossed className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">FamilyPlate</h1>
        <p className="text-muted-foreground text-base max-w-[280px]">
          Smart dinner planning for your whole family. Less waste, more flavor.
        </p>
      </div>

      {/* Features */}
      <div className="flex gap-3 mb-8">
        {["🍳 Plan", "🛒 Shop", "⭐ Rate"].map((feature) => (
          <div
            key={feature}
            className="bg-secondary rounded-full px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            {feature}
          </div>
        ))}
      </div>

      {/* Sign In Card */}
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg">Get Started</CardTitle>
          <CardDescription>
            Sign in with your email to start planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Sending link...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-4">
            We&apos;ll send you a magic link to sign in — no password needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
