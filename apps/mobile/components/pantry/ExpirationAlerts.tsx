import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Doc } from "@familyplate/convex/_generated/dataModel";

type PantryItem = Doc<"pantryItems">;

function getExpirationGroups(items: PantryItem[]) {
  const now = Date.now();

  const expired = items
    .filter((item) => item.expirationDate && item.expirationDate < now)
    .sort((a, b) => (a.expirationDate ?? 0) - (b.expirationDate ?? 0));

  const expiring = items
    .filter((item) => {
      if (!item.expirationDate) return false;
      const daysLeft = (item.expirationDate - now) / (24 * 60 * 60 * 1000);
      return daysLeft <= 3 && daysLeft > 0;
    })
    .sort((a, b) => (a.expirationDate ?? 0) - (b.expirationDate ?? 0));

  return { expired, expiring, now };
}

function formatDays(expirationDate: number, now: number) {
  const days = Math.ceil((expirationDate - now) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Expired";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

function ItemPills({
  items,
  tone,
  now,
}: {
  items: PantryItem[];
  tone: "expired" | "soon";
  now: number;
}) {
  const visibleItems = items.slice(0, 5);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <View className="mt-2 flex-row flex-wrap gap-1.5">
      {visibleItems.map((item) => (
        <View
          key={item._id}
          className="rounded-full border px-2 py-1"
          style={{
            backgroundColor: tone === "expired" ? "#fef2f2" : "#fffbeb",
            borderColor: tone === "expired" ? "#fecaca" : "#fde68a",
          }}
        >
          <Text
            className="text-[11px] font-semibold"
            style={{ color: tone === "expired" ? "#b91c1c" : "#92400e" }}
          >
            {tone === "soon" && item.expirationDate
              ? `${item.name} - ${formatDays(item.expirationDate, now)}`
              : item.name}
          </Text>
        </View>
      ))}
      {hiddenCount > 0 ? (
        <View className="rounded-full border border-border bg-muted px-2 py-1">
          <Text className="text-[11px] font-semibold text-muted-foreground">
            +{hiddenCount} more
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ExpirationAlerts({ items }: { items: PantryItem[] }) {
  const { expired, expiring, now } = getExpirationGroups(items);

  if (expired.length === 0 && expiring.length === 0) return null;

  return (
    <View className="gap-2">
      {expired.length > 0 ? (
        <View className="rounded-2xl border border-red-200 bg-red-50 p-3">
          <View className="flex-row items-start gap-2">
            <Ionicons
              name="warning-outline"
              size={17}
              color="#b91c1c"
              style={{ marginTop: 1 }}
            />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-red-700">
                {expired.length} item{expired.length === 1 ? "" : "s"} expired
              </Text>
              <ItemPills items={expired} tone="expired" now={now} />
            </View>
          </View>
        </View>
      ) : null}

      {expiring.length > 0 ? (
        <View className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <View className="flex-row items-start gap-2">
            <Ionicons
              name="time-outline"
              size={17}
              color="#92400e"
              style={{ marginTop: 1 }}
            />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-amber-800">
                Expiring soon
              </Text>
              <ItemPills items={expiring} tone="soon" now={now} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
