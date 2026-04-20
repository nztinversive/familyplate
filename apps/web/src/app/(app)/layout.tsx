import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ErrorBoundary>
        {children}
        <InstallPrompt />
      </ErrorBoundary>
    </AuthGuard>
  );
}
