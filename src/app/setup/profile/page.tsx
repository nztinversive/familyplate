"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ArrowRight, ArrowLeft, Plus, X, UserPlus, UtensilsCrossed, Heart, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Id } from "../../../../convex/_generated/dataModel";

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free",
  "Keto", "Paleo", "Halal", "Kosher", "Low-Sodium",
];

const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Milk", "Eggs", "Wheat",
  "Soy", "Fish", "Shellfish", "Sesame",
];

interface FamilyMember {
  name: string;
  isChild: boolean;
  age?: number;
  dietaryPreferences: string[];
  allergies: string[];
  dislikes: string[];
}

const STEP_META = [
  { num: 1, label: "Profile", icon: Heart },
  { num: 2, label: "Safety", icon: Shield },
  { num: 3, label: "Family", icon: Users },
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const updateProfile = useMutation(api.mutations.profiles.updateProfile);
  const addFamilyMemberMutation = useMutation(api.mutations.profiles.addFamilyMember);
  const myProfile = useQuery(api.queries.profiles.getMyProfile, {});

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  useEffect(() => {
    if (myProfile?.name && !name) setName(myProfile.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = useState("");
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberIsChild, setNewMemberIsChild] = useState(false);
  const [newMemberAge, setNewMemberAge] = useState("");

  const toggleItem = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const addDislike = () => {
    if (dislikeInput.trim() && !dislikes.includes(dislikeInput.trim())) {
      setDislikes([...dislikes, dislikeInput.trim()]);
      setDislikeInput("");
    }
  };

  const addFamilyMember = () => {
    if (!newMemberName.trim()) return;
    setFamilyMembers([...familyMembers, {
      name: newMemberName.trim(), isChild: newMemberIsChild,
      age: newMemberAge ? parseInt(newMemberAge) : undefined,
      dietaryPreferences: [], allergies: [], dislikes: [],
    }]);
    setNewMemberName(""); setNewMemberIsChild(false); setNewMemberAge("");
    setShowAddMember(false);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setError("");
    try {
      const householdId = (myProfile?.householdId ?? localStorage.getItem("fp_householdId")) as Id<"households"> | null;
      if (myProfile?._id) {
        await updateProfile({
          profileId: myProfile._id,
          name: name.trim() || undefined,
          age: age ? parseInt(age) : undefined,
          dietaryPreferences: selectedDietary.length > 0 ? selectedDietary : undefined,
          allergies: selectedAllergies.length > 0 ? selectedAllergies : undefined,
          dislikes: dislikes.length > 0 ? dislikes : undefined,
        });
      }
      if (householdId && familyMembers.length > 0) {
        for (const member of familyMembers) {
          await addFamilyMemberMutation({
            householdId, name: member.name, isChild: member.isChild,
            age: member.age, dietaryPreferences: member.dietaryPreferences,
            allergies: member.allergies, dislikes: member.dislikes,
          });
        }
      }
      router.push("/pantry");
    } catch (err) {
      console.error("Profile setup failed:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container min-h-screen flex flex-col items-center px-6 py-8 bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
          <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight">FamilyPlate</span>
      </div>

      <div className="w-full max-w-sm flex-1 flex flex-col">
        {/* Progress stepper */}
        <div className="flex items-center gap-2 mb-8 animate-fade-in">
          {STEP_META.map((s, i) => {
            const Icon = s.icon;
            const isActive = step >= s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm scale-110"
                    : isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={`text-[11px] font-medium hidden sm:inline transition-colors ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < STEP_META.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${isActive && step > s.num ? "bg-primary/40" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 mb-3">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight mb-1">About You</h1>
              <p className="text-sm text-muted-foreground">Help us personalize your meal suggestions</p>
            </div>
            <Card className="border-0 shadow-lg shadow-foreground/5">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input id="name" placeholder="Noah" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age (optional)</Label>
                  <Input id="age" type="number" placeholder="30" value={age} onChange={(e) => setAge(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Dietary Preferences</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                          selectedDietary.includes(option)
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-input bg-background text-foreground hover:border-primary/30"
                        }`}
                        onClick={() => toggleItem(option, selectedDietary, setSelectedDietary)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full gap-2 rounded-xl" size="lg" onClick={() => setStep(2)} disabled={!name.trim()}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Allergies & Dislikes */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive/15 to-destructive/5 mb-3">
                <Shield className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="text-xl font-bold tracking-tight mb-1">Allergies & Dislikes</h1>
              <p className="text-sm text-muted-foreground">We&apos;ll never include these in your plans</p>
            </div>
            <Card className="border-0 shadow-lg shadow-foreground/5">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label>Allergies</Label>
                  <p className="text-xs text-muted-foreground">These are strictly enforced — even derivative ingredients are blocked.</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGIES.map((allergy) => (
                      <button
                        key={allergy}
                        type="button"
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                          selectedAllergies.includes(allergy)
                            ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
                            : "border-input bg-background text-foreground hover:border-destructive/30"
                        }`}
                        onClick={() => toggleItem(allergy, selectedAllergies, setSelectedAllergies)}
                      >
                        {allergy}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Foods You Dislike</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Brussels sprouts"
                      value={dislikeInput}
                      onChange={(e) => setDislikeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDislike(); } }}
                      className="h-10 rounded-xl flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addDislike} className="rounded-xl shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {dislikes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dislikes.map((dislike) => (
                        <Badge key={dislike} variant="secondary" className="pr-1 gap-1">
                          {dislike}
                          <button onClick={() => setDislikes(dislikes.filter((d) => d !== dislike))} className="hover:text-destructive rounded-sm">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2 rounded-xl">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1 gap-2 rounded-xl" onClick={() => setStep(3)}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Family Members */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 mb-3">
                <Users className="h-7 w-7 text-accent" />
              </div>
              <h1 className="text-xl font-bold tracking-tight mb-1">Family Members</h1>
              <p className="text-sm text-muted-foreground">Add your family so we can plan for everyone</p>
            </div>
            <Card className="border-0 shadow-lg shadow-foreground/5">
              <CardContent className="p-5 space-y-4">
                {familyMembers.length > 0 && (
                  <div className="space-y-2">
                    {familyMembers.map((member, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {member.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.isChild ? "Child" : "Adult"}{member.age ? `, ${member.age}y` : ""}
                          </p>
                        </div>
                        <button onClick={() => setFamilyMembers(familyMembers.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive transition-colors rounded-lg p-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showAddMember ? (
                  <div className="space-y-3 p-3 border rounded-xl bg-muted/20 animate-fade-in">
                    <Input placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="rounded-xl" autoFocus />
                    <div className="flex gap-2 items-center">
                      <Input placeholder="Age" type="number" value={newMemberAge} onChange={(e) => setNewMemberAge(e.target.value)} className="w-20 rounded-xl" />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNewMemberIsChild(!newMemberIsChild)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${newMemberIsChild ? "bg-primary" : "bg-muted"}`}
                        >
                          <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform mt-0.5 ml-0.5 ${newMemberIsChild ? "translate-x-4" : ""}`} />
                        </button>
                        <span className="text-xs text-muted-foreground">Child</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowAddMember(false)} className="flex-1 rounded-xl">Cancel</Button>
                      <Button size="sm" onClick={addFamilyMember} className="flex-1 rounded-xl" disabled={!newMemberName.trim()}>Add</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => setShowAddMember(true)}>
                    <UserPlus className="h-4 w-4" />
                    Add Family Member
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  You can always add more people later in Settings.
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 gap-2 rounded-xl">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1 gap-2 rounded-xl" onClick={handleFinish} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Finish Setup"}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
