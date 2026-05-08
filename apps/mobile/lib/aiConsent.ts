import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AI_CONSENT_KEY = "familyplate.aiConsent.v1";

export const AI_CONSENT_DISCLOSURE =
  "FamilyPlate uses third-party AI providers to create meal plans, dinner ideas, and grocery recognition. Your pantry items, recipes, dietary preferences, allergies, dislikes, household details, prompts, and grocery photos may be sent to those providers to fulfill your request. AI can make mistakes, so verify ingredients, labels, and allergy safety before cooking.";

export async function hasAiConsent() {
  return (await AsyncStorage.getItem(AI_CONSENT_KEY)) === "accepted";
}

export async function acceptAiConsent() {
  await AsyncStorage.setItem(AI_CONSENT_KEY, "accepted");
}

export async function clearAiConsent() {
  await AsyncStorage.removeItem(AI_CONSENT_KEY);
}

export async function ensureAiConsent() {
  if (await hasAiConsent()) {
    return true;
  }

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
            void acceptAiConsent().then(() => resolve(true));
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
