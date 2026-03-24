"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ArrowRight, ArrowLeft, Plus, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Id } from "../../../../convex/_generated/dataModel";

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Halal",
  "Kosher",
  "Low-Sodium",
];

const COMMON_ALLERGIES = [
  "Peanuts",
  "Tree Nuts",
  "Milk",
  "Eggs",
  "Wheat",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
];

interface FamilyMember {
  name: string;
  isChild: boolean;
  age?: number;
  dietaryPreferences: string[];
  allergies: string[];
  dislikes: string[];
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const updateProfile = useMutation(api.mutations.profiles.updateProfile);
  const addFamilyMemberMutation = useMutation(api.mutations.profiles.addFamilyMember);

  // Get current user's profile from Convex
  const authId = typeof window !== "undefined" ? localStorage.getItem("fp_authId") || "" : "";
  const myProfile = useQuery(api.queries.profiles.getMyProfile, authId ? { authId } : "skip");

  // Step 1: Your profile
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  // Pre-fill name from localStorage
  useEffect(() => {
    const storedName = typeof window !== "undefined" ? localStorage.getItem("fp_userName") || "" : "";
    if (storedName && !name) setName(storedName);
  }, []);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

  // Step 2: Allergies & dislikes
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = useState("");
  const [dislikes, setDislikes] = useState<string[]>([]);

  // Step 3: Family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberIsChild, setNewMemberIsChild] = useState(false);
  const [newMemberAge, setNewMemberAge] = useState("");

  const toggleItem = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addDislike = () => {
    if (dislikeInput.trim() && !dislikes.includes(dislikeInput.trim())) {
      setDislikes([...dislikes, dislikeInput.trim()]);
      setDislikeInput("");
    }
  };

  const addFamilyMember = () => {
    if (!newMemberName.trim()) return;
    setFamilyMembers([
      ...familyMembers,
      {
        name: newMemberName.trim(),
        isChild: newMemberIsChild,
        age: newMemberAge ? parseInt(newMemberAge) : undefined,
        dietaryPreferences: [],
        allergies: [],
        dislikes: [],
      },
    ]);
    setNewMemberName("");
    setNewMemberIsChild(false);
    setNewMemberAge("");
    setShowAddMember(false);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setError("");
    try {
      const householdId = localStorage.getItem("fp_householdId") as Id<"households"> | null;

      // Update the current user's profile if we have it
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

      // Add family members if we have a household
      if (householdId && familyMembers.length > 0) {
        for (const member of familyMembers) {
          await addFamilyMemberMutation({
            householdId,
            name: member.name,
            isChild: member.isChild,
            age: member.age,
            dietaryPreferences: member.dietaryPreferences,
            allergies: member.allergies,
            dislikes: member.dislikes,
          });
        }
      }

      router.push("/pantry");
    } catch (err) {
      console.error("Profile setup failed:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-1.5 rounded-full bg-primary flex-1" />
          <div
            className={`h-1.5 rounded-full flex-1 ${
              step >= 2 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-1.5 rounded-full flex-1 ${
              step >= 3 ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>About You</CardTitle>
              <CardDescription>
                Help us personalize your meal suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Noah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age (optional)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="30"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Dietary Preferences</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((option) => (
                    <Badge
                      key={option}
                      variant={
                        selectedDietary.includes(option)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer text-sm py-1.5 px-3"
                      onClick={() =>
                        toggleItem(option, selectedDietary, setSelectedDietary)
                      }
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => setStep(2)}
                disabled={!name.trim()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Allergies & Dislikes */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Allergies & Dislikes</CardTitle>
              <CardDescription>
                We&apos;ll avoid these in your meal suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Allergies</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGIES.map((allergy) => (
                    <Badge
                      key={allergy}
                      variant={
                        selectedAllergies.includes(allergy)
                          ? "destructive"
                          : "outline"
                      }
                      className="cursor-pointer text-sm py-1.5 px-3"
                      onClick={() =>
                        toggleItem(
                          allergy,
                          selectedAllergies,
                          setSelectedAllergies
                        )
                      }
                    >
                      {allergy}
                    </Badge>
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
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDislike())}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addDislike}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {dislikes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dislikes.map((dislike) => (
                      <Badge
                        key={dislike}
                        variant="secondary"
                        className="pr-1"
                      >
                        {dislike}
                        <button
                          onClick={() =>
                            setDislikes(dislikes.filter((d) => d !== dislike))
                          }
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Family Members */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Family Members</CardTitle>
              <CardDescription>
                Add your family so we can plan for everyone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {familyMembers.length > 0 && (
                <div className="space-y-2">
                  {familyMembers.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {member.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.isChild ? "Child" : "Adult"}
                          {member.age ? `, ${member.age}y` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFamilyMember(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddMember ? (
                <div className="space-y-3 p-3 border rounded-lg">
                  <Input
                    placeholder="Name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Age"
                      type="number"
                      value={newMemberAge}
                      onChange={(e) => setNewMemberAge(e.target.value)}
                      className="w-20"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newMemberIsChild}
                        onChange={(e) => setNewMemberIsChild(e.target.checked)}
                        className="rounded"
                      />
                      Child
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMember(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={addFamilyMember}
                      className="flex-1"
                      disabled={!newMemberName.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Family Member
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                You can always add more people later in Settings.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleFinish}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Finish Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
