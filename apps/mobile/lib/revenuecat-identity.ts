export type RevenueCatIdentityClient = {
  isConfigured: () => Promise<boolean>;
  configure: (options: {
    apiKey: string;
    appUserID?: string;
    automaticDeviceIdentifierCollectionEnabled: boolean;
  }) => void;
  getAppUserID: () => Promise<string>;
  isAnonymous: () => Promise<boolean>;
  logIn: (appUserId: string) => Promise<unknown>;
  logOut: () => Promise<unknown>;
  setEmail: (email: string | null) => Promise<void>;
};

async function configureIfNeeded(
  client: RevenueCatIdentityClient,
  apiKey: string,
  appUserId?: string,
) {
  if (await client.isConfigured()) return false;
  client.configure({
    apiKey,
    appUserID: appUserId,
    automaticDeviceIdentifierCollectionEnabled: false,
  });
  return true;
}

export async function syncRevenueCatIdentity({
  client,
  apiKey,
  appUserId,
  email,
}: {
  client: RevenueCatIdentityClient;
  apiKey: string;
  appUserId: string;
  email?: string | null;
}) {
  const configuredNow = await configureIfNeeded(client, apiKey, appUserId);
  if (configuredNow) {
    await client.setEmail(email ?? null);
    return;
  }

  const nativeAppUserId = await client.getAppUserID();
  if (nativeAppUserId !== appUserId) {
    await client.logIn(appUserId);
  }
  await client.setEmail(email ?? null);
}

export async function clearRevenueCatIdentity({
  client,
  apiKey,
}: {
  client: RevenueCatIdentityClient;
  apiKey: string;
}) {
  await configureIfNeeded(client, apiKey);
  if (!(await client.isAnonymous())) {
    await client.logOut();
  }
  await client.setEmail(null);
}
