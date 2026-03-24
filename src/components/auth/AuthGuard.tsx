"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { api } from "../../../convex/_generated/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // Check if user has a household (only query when authenticated)
  const myProfile = useQuery(
    api.queries.profiles.getMyProfile,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
