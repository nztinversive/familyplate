import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearStoredAiConsent,
  hasStoredAiConsent,
  storeAiConsent,
} from "@/lib/aiConsent-storage";

export const AI_CONSENT_DISCLOSURE =
  "FamilyPlate uses third-party AI providers to create meal plans, dinner ideas, and grocery recognition. Your pantry items, recipes, dietary preferences, allergies, dislikes, household details, prompts, and grocery photos may be sent to those providers to fulfill your request. AI can make mistakes, so verify ingredients, labels, and allergy safety before cooking.";

export async function hasAiConsent(authId: string | null | undefined) {
  return await hasStoredAiConsent(AsyncStorage, authId);
}

export async function acceptAiConsent(authId: string | null | undefined) {
  return await storeAiConsent(AsyncStorage, authId);
}

export async function clearAiConsent(authId: string | null | undefined) {
  return await clearStoredAiConsent(AsyncStorage, authId);
}

export async function ensureAiConsent(authId: string | null | undefined) {
  if (await hasAiConsent(authId)) {
    return true;
  }

  if (!authId?.trim()) return false;

  return await new Promise<boolean>((resolve) => {
    Alert.alert(
      "Allow AI features?",
      AI_CONSENT_DISCLOSURE,
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "I agree",
          onPress: () => {
            void acceptAiConsent(authId).then(resolve);
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      },
    );
  });
}
