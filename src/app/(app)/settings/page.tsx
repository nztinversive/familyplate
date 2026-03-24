"use client";

import { User, Users, Bell, LogOut, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const settingsItems = [
  { icon: User, label: "My Profile", description: "Edit dietary preferences, allergies" },
  { icon: Users, label: "Household", description: "Manage members, invite code" },
  { icon: Bell, label: "Notifications", description: "Meal reminders, expiration alerts" },
];

export default function SettingsPage() {
  return (
    <AppShell header={<PageHeader title="Settings" />}>
      <div className="px-4 py-4 space-y-4">
        <Card>
          <CardContent className="p-0">
            {settingsItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {index < settingsItems.length - 1 && (
                    <Separator className="ml-[68px]" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left text-destructive">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <LogOut className="h-5 w-5" />
              </div>
              <p className="font-medium text-sm">Sign Out</p>
            </button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pt-4">
          FamilyPlate v0.1.0
        </p>
      </div>
    </AppShell>
  );
}
