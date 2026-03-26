"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { LogOut, Mail, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function renderList(values?: string[]) {
  if (!values || values.length === 0) {
    return <p className="text-sm text-muted-foreground">None added yet</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant="outline">
          {value}
        </Badge>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const profile = useQuery(api.queries.profiles.getMyProfile, {});
  const household = useQuery(api.queries.households.getMyHousehold, {});
  const members = useQuery(
    api.queries.profiles.getProfiles,
    currentUser?.householdId ? { householdId: currentUser.householdId } : "skip"
  );

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <AppShell
      header={
        <PageHeader
          title="Settings"
          subtitle={household ? household.name : "Profile and household"}
        />
      }
    >
      <div className="space-y-4 px-4 py-4">
        {currentUser === undefined || profile === undefined || household === undefined ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {currentUser && (
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                      {currentUser.userName?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{profile?.name ?? currentUser.userName}</p>
                      <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{currentUser.email || "No email on file"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{profile?.role ?? "member"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{profile?.isChild ? "Child profile" : "Adult profile"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Household</p>
                    <h2 className="text-lg font-semibold">
                      {household?.name ?? "No household"}
                    </h2>
                  </div>
                  {household?.inviteCode && <Badge>{household.inviteCode}</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Members
                    </p>
                    <p className="mt-1 text-lg font-semibold">{members?.length ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Created
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {household?.createdAt
                        ? new Date(household.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Household Members</p>
                  <div className="space-y-2">
                    {(members ?? []).map((member, index) => (
                      <div key={member._id}>
                        <div className="flex items-center justify-between gap-3 py-1">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.email || "Managed household profile"}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Badge variant="outline" className="capitalize">
                              {member.role}
                            </Badge>
                            {member.isChild && <Badge variant="secondary">Child</Badge>}
                          </div>
                        </div>
                        {index < (members?.length ?? 0) - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div>
                  <p className="text-sm font-medium">Dietary Preferences</p>
                  <div className="mt-2">{renderList(profile?.dietaryPreferences)}</div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Allergies</p>
                  <div className="mt-2">{renderList(profile?.allergies)}</div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Dislikes</p>
                  <div className="mt-2">{renderList(profile?.dislikes)}</div>
                </div>
                {profile?.goals && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium">Goals</p>
                      <p className="mt-2 text-sm text-muted-foreground">{profile.goals}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardContent className="p-0">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 p-4 text-left text-destructive transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <LogOut className="h-5 w-5" />
              </div>
              <p className="font-medium text-sm">Sign Out</p>
            </button>
          </CardContent>
        </Card>

        <p className="pt-4 text-center text-xs text-muted-foreground">FamilyPlate v0.1.0</p>
      </div>
    </AppShell>
  );
}
