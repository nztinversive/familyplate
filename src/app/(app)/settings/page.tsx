"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Copy, LogOut, Mail, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const addFamilyMember = useMutation(api.mutations.profiles.addFamilyMember);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberIsChild, setMemberIsChild] = useState(false);
  const [memberAge, setMemberAge] = useState("");
  const [memberDietary, setMemberDietary] = useState("");
  const [memberAllergies, setMemberAllergies] = useState("");
  const [memberDislikes, setMemberDislikes] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const resetMemberForm = () => {
    setMemberName("");
    setMemberIsChild(false);
    setMemberAge("");
    setMemberDietary("");
    setMemberAllergies("");
    setMemberDislikes("");
  };

  const handleAddMember = async () => {
    if (!memberName.trim() || !currentUser?.householdId) return;
    setIsAddingMember(true);
    try {
      await addFamilyMember({
        householdId: currentUser.householdId as Id<"households">,
        name: memberName.trim(),
        isChild: memberIsChild,
        age: memberAge ? parseInt(memberAge) : undefined,
        dietaryPreferences: memberDietary ? memberDietary.split(",").map((s) => s.trim()).filter(Boolean) : [],
        allergies: memberAllergies ? memberAllergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
        dislikes: memberDislikes ? memberDislikes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      resetMemberForm();
      setShowAddMember(false);
    } catch (err) {
      console.error("Failed to add member:", err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleCopyInvite = () => {
    if (household?.inviteCode) {
      navigator.clipboard.writeText(household.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

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
                  {household?.inviteCode && (
                    <button
                      onClick={handleCopyInvite}
                      className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedInvite ? "Copied!" : household.inviteCode}
                    </button>
                  )}
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
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Household Members</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMember(true)}
                      className="gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add Member
                    </Button>
                  </div>
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

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Add a household member. They will be included in meal planning preferences.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddMember();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="e.g. Sarah"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="member-child" className="flex-1">Child profile</Label>
              <button
                id="member-child"
                type="button"
                onClick={() => setMemberIsChild(!memberIsChild)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  memberIsChild ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
                    memberIsChild ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {memberIsChild && (
              <div className="space-y-2">
                <Label htmlFor="member-age">Age</Label>
                <Input
                  id="member-age"
                  type="number"
                  min="1"
                  max="17"
                  value={memberAge}
                  onChange={(e) => setMemberAge(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="member-dietary">Dietary Preferences</Label>
              <Input
                id="member-dietary"
                value={memberDietary}
                onChange={(e) => setMemberDietary(e.target.value)}
                placeholder="e.g. vegetarian, gluten-free (comma separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-allergies">Allergies</Label>
              <Input
                id="member-allergies"
                value={memberAllergies}
                onChange={(e) => setMemberAllergies(e.target.value)}
                placeholder="e.g. peanuts, shellfish (comma separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-dislikes">Dislikes</Label>
              <Input
                id="member-dislikes"
                value={memberDislikes}
                onChange={(e) => setMemberDislikes(e.target.value)}
                placeholder="e.g. mushrooms, olives (comma separated)"
              />
            </div>

            <Button type="submit" className="w-full" disabled={!memberName.trim() || isAddingMember}>
              {isAddingMember ? "Adding..." : "Add Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
