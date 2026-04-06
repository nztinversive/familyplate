"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Copy, LogOut, Mail, Moon, ShieldCheck, UserPlus, Users } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

function renderList(values?: string[]) {
  if (!values || values.length === 0) {
    return <p className="text-sm text-muted-foreground">None added yet</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="outline" className="text-xs">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function parseCommaSeparatedList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const profile = useQuery(api.queries.profiles.getMyProfile, {});
  const household = useQuery(api.queries.households.getMyHousehold, {});
  const subscription = useQuery(api.subscriptions.getMySubscription, {});
  const members = useQuery(
    api.queries.profiles.getProfiles,
    currentUser?.householdId ? { householdId: currentUser.householdId } : "skip"
  );
  const addFamilyMember = useMutation(api.mutations.profiles.addFamilyMember);
  const updateProfile = useMutation(api.mutations.profiles.updateProfile);
  const sendInviteEmail = useAction(api.actions.sendInviteEmail.sendInviteEmail);

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberIsChild, setMemberIsChild] = useState(false);
  const [memberAge, setMemberAge] = useState("");
  const [memberDietary, setMemberDietary] = useState("");
  const [memberAllergies, setMemberAllergies] = useState("");
  const [memberDislikes, setMemberDislikes] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [allergiesInput, setAllergiesInput] = useState("");
  const [dislikesInput, setDislikesInput] = useState("");
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const profileAllergiesValue = (profile?.allergies ?? []).join(", ");
  const profileDislikesValue = (profile?.dislikes ?? []).join(", ");
  const canManageMembers = profile?.role === "admin";

  useEffect(() => {
    setAllergiesInput(profileAllergiesValue);
    setDislikesInput(profileDislikesValue);
  }, [profile?._id, profileAllergiesValue, profileDislikesValue]);

  const parsedAllergies = useMemo(
    () => parseCommaSeparatedList(allergiesInput),
    [allergiesInput]
  );
  const parsedDislikes = useMemo(
    () => parseCommaSeparatedList(dislikesInput),
    [dislikesInput]
  );
  const hasPreferenceChanges =
    parsedAllergies.join("|") !== (profile?.allergies ?? []).join("|") ||
    parsedDislikes.join("|") !== (profile?.dislikes ?? []).join("|");
  const subscriptionTierLabel =
    subscription === undefined ? "Loading..." : subscription.tier === "family" ? "Family" : "Free";
  const subscriptionStatusLabel =
    subscription === undefined
      ? "Checking subscription"
      : subscription.status
        ? subscription.status.replace(/_/g, " ")
        : "active";
  const buildCheckoutHref = (variantId: string) => {
    const checkoutUrl = new URL(
      `https://familyplate.lemonsqueezy.com/buy/${variantId}`
    );

    if (currentUser?.email) {
      checkoutUrl.searchParams.set("checkout[email]", currentUser.email);
    }

    if (currentUser?.authId) {
      checkoutUrl.searchParams.set("checkout[custom][auth_id]", currentUser.authId);
    }

    return checkoutUrl.toString();
  };
  const subscriptionActionHref =
    subscription?.tier === "family"
      ? "https://familyplate.lemonsqueezy.com/billing"
      : buildCheckoutHref("1485021");
  const subscriptionAnnualHref = buildCheckoutHref("1485023");
  const subscriptionActionLabel = subscription?.tier === "family" ? "Manage" : "Upgrade";

  const resetMemberForm = () => {
    setMemberName("");
    setMemberEmail("");
    setMemberIsChild(false);
    setMemberAge("");
    setMemberDietary("");
    setMemberAllergies("");
    setMemberDislikes("");
    setEmailSent(null);
  };

  const handleAddMember = async () => {
    if (!memberName.trim() || !currentUser?.householdId) return;
    setIsAddingMember(true);
    try {
      await addFamilyMember({
        householdId: currentUser.householdId as Id<"households">,
        name: memberName.trim(),
        email: !memberIsChild && memberEmail.trim() ? memberEmail.trim() : undefined,
        isChild: memberIsChild,
        age: memberAge ? parseInt(memberAge) : undefined,
        dietaryPreferences: memberDietary ? memberDietary.split(",").map((s) => s.trim()).filter(Boolean) : [],
        allergies: memberAllergies ? memberAllergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
        dislikes: memberDislikes ? memberDislikes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });

      if (memberEmail.trim() && !memberIsChild && household?._id) {
        try {
          await sendInviteEmail({
            toEmail: memberEmail.trim(),
            memberName: memberName.trim(),
            householdId: household._id,
          });
          setEmailSent(memberEmail.trim());
        } catch (emailErr) {
          console.error("Failed to send invite email:", emailErr);
        }
      }

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

  const handleSavePreferences = async () => {
    if (!profile?._id || !hasPreferenceChanges) return;

    setIsSavingPreferences(true);
    setPreferencesError("");
    setPreferencesSaved(false);

    try {
      await updateProfile({
        profileId: profile._id,
        allergies: parsedAllergies,
        dislikes: parsedDislikes,
      });
      setPreferencesSaved(true);
    } catch (err) {
      setPreferencesError(
        err instanceof Error ? err.message : "Unable to save preferences."
      );
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleResetPreferences = () => {
    setAllergiesInput(profile?.allergies?.join(", ") ?? "");
    setDislikesInput(profile?.dislikes?.join(", ") ?? "");
    setPreferencesError("");
    setPreferencesSaved(false);
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
      <div className="space-y-4 px-4 py-4 page-transition">
        {currentUser === undefined || profile === undefined || household === undefined ? (
          <div className="space-y-3">
            <div className="skeleton-shimmer h-32 rounded-xl" />
            <div className="skeleton-shimmer h-48 rounded-xl" />
            <div className="skeleton-shimmer h-40 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Profile card */}
            {currentUser && (
              <Card className="overflow-hidden opacity-0 animate-fade-in">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-primary/8 to-transparent p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm transition-transform hover:scale-105 active:scale-95"
                        aria-label="Change avatar"
                      >
                        {selectedAvatar ? (
                          <span className="text-2xl select-none">{selectedAvatar}</span>
                        ) : (
                          <span className="text-xl font-bold text-primary-foreground">
                            {currentUser.userName?.[0]?.toUpperCase() || "U"}
                          </span>
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="font-semibold text-lg tracking-tight">{profile?.name ?? currentUser.userName}</p>
                        <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {showAvatarPicker && (
                    <div className="px-4 pb-3 animate-fade-in">
                      <p className="text-xs text-muted-foreground mb-2">Choose your avatar:</p>
                      <div className="flex flex-wrap gap-2">
                        {["🍅", "🥑", "🍋", "🥕", "🌽", "🍇", "🍑", "🧄", "🫑", "🍳", "🧁", "🍕"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => { setSelectedAvatar(emoji); setShowAvatarPicker(false); }}
                            className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 ${
                              selectedAvatar === emoji
                                ? "bg-primary/15 ring-2 ring-primary"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setSelectedAvatar(null); setShowAvatarPicker(false); }}
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold bg-muted/50 hover:bg-muted transition-all text-muted-foreground"
                          title="Use initial"
                        >
                          {currentUser.userName?.[0]?.toUpperCase() || "U"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-px bg-border">
                    <div className="bg-card p-3 text-center">
                      <Mail className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground truncate">{currentUser.email ? "Verified" : "No email"}</p>
                    </div>
                    <div className="bg-card p-3 text-center">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground capitalize">{profile?.role ?? "member"}</p>
                    </div>
                    <div className="bg-card p-3 text-center">
                      <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">{profile?.isChild ? "Child" : "Adult"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Household card */}
            <Card className="opacity-0 animate-fade-in stagger-2">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Household</p>
                    <h2 className="text-lg font-semibold tracking-tight mt-0.5">
                      {household?.name ?? "No household"}
                    </h2>
                  </div>
                  {household?.inviteCode && (
                    <button
                      onClick={handleCopyInvite}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        copiedInvite
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Copy className="h-3 w-3" />
                      {copiedInvite ? "Copied!" : household.inviteCode}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Members
                    </p>
                    <p className="mt-1 text-xl font-bold tracking-tight">{members?.length ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                      disabled={!canManageMembers}
                      className="gap-1.5 rounded-xl"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                  {!canManageMembers && (
                    <p className="text-xs text-muted-foreground">
                      Only the household admin can add or invite members.
                    </p>
                  )}
                  <div className="space-y-1">
                    {(members ?? []).map((member, index) => (
                      <div key={member._id}>
                        <div className="flex items-center justify-between gap-3 py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                              {member.name[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{member.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {member.email || "Managed profile"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {member.role}
                            </Badge>
                            {member.isChild && <Badge variant="secondary" className="text-[10px]">Child</Badge>}
                          </div>
                        </div>
                        {index < (members?.length ?? 0) - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences card */}
            <Card className="opacity-0 animate-fade-in stagger-3">
              <CardContent className="space-y-4 p-4">
                <div>
                  <p className="text-sm font-medium">Dietary Preferences</p>
                  <div className="mt-2">{renderList(profile?.dietaryPreferences)}</div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Allergies</p>
                  <div className="mt-2 space-y-3">
                    {renderList(profile?.allergies)}
                    <div className="space-y-2">
                      <Label htmlFor="settings-allergies">Edit allergies</Label>
                      <Textarea
                        id="settings-allergies"
                        value={allergiesInput}
                        onChange={(e) => {
                          setAllergiesInput(e.target.value);
                          setPreferencesError("");
                          setPreferencesSaved(false);
                        }}
                        placeholder="e.g. peanuts, shellfish, dairy"
                        rows={3}
                        className="rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate each allergy with a comma.
                      </p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Dislikes</p>
                  <div className="mt-2 space-y-3">
                    {renderList(profile?.dislikes)}
                    <div className="space-y-2">
                      <Label htmlFor="settings-dislikes">Edit dislikes</Label>
                      <Textarea
                        id="settings-dislikes"
                        value={dislikesInput}
                        onChange={(e) => {
                          setDislikesInput(e.target.value);
                          setPreferencesError("");
                          setPreferencesSaved(false);
                        }}
                        placeholder="e.g. mushrooms, olives, brussels sprouts"
                        rows={3}
                        className="rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate each food with a comma.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                  {preferencesError && (
                    <p className="text-sm text-destructive animate-scale-in">{preferencesError}</p>
                  )}
                  {preferencesSaved && !preferencesError && (
                    <p className="text-sm text-primary animate-scale-in">Preferences updated.</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => void handleSavePreferences()}
                      disabled={!profile?._id || !hasPreferenceChanges || isSavingPreferences}
                    >
                      {isSavingPreferences ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResetPreferences}
                      disabled={!hasPreferenceChanges || isSavingPreferences}
                    >
                      Cancel
                    </Button>
                  </div>
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

        {/* Subscription */}
        <Card className="opacity-0 animate-fade-in stagger-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Subscription</p>
                <p className="text-xs text-muted-foreground">
                  {subscriptionTierLabel} plan • {subscriptionStatusLabel}
                </p>
              </div>
              {subscription?.tier === "family" && (
                <a
                  href={subscriptionActionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Manage
                </a>
              )}
            </div>
            {subscription?.tier !== "family" && (
              <div className="flex gap-2">
                <a
                  href={subscriptionActionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-medium h-9 px-3 hover:bg-primary/90 transition-colors"
                >
                  Monthly — $5.99/mo
                </a>
                <a
                  href={subscriptionAnnualHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-primary text-primary text-sm font-medium h-9 px-3 hover:bg-primary/5 transition-colors"
                >
                  Annual — Save 32%
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="opacity-0 animate-fade-in stagger-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Appearance</p>
                  <p className="text-xs text-muted-foreground">Toggle dark mode</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Sign out */}
        <Card className="opacity-0 animate-fade-in stagger-5">
          <CardContent className="p-0">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 p-4 text-left text-destructive transition-all hover:bg-destructive/5 rounded-lg"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <LogOut className="h-5 w-5" />
              </div>
              <p className="font-medium text-sm">Sign Out</p>
            </button>
          </CardContent>
        </Card>

        <p className="pt-4 pb-2 text-center text-[11px] text-muted-foreground/50">FamilyPlate v0.1.0</p>
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

            <div className="space-y-2">
              <Label htmlFor="member-email">Email (optional)</Label>
              <Input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="They'll get an invite with the household code"
                disabled={memberIsChild}
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
              <div className="space-y-2 animate-fade-in">
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
