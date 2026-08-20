"use client";

import { useEffect, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";

const QUOTA_REFRESH_INTERVAL_MS = 60_000;

export function useMySubscription() {
  // Keep the reactive no-argument query for compatibility while the backend
  // and clients roll out independently.
  const subscription = useQuery(api.subscriptions.getMySubscription, {});
  const convex = useConvex();
  const [timeBucket, setTimeBucket] = useState(() =>
    Math.floor(Date.now() / QUOTA_REFRESH_INTERVAL_MS),
  );
  const [refreshedSubscription, setRefreshedSubscription] =
    useState<typeof subscription>();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeBucket(Math.floor(Date.now() / QUOTA_REFRESH_INTERVAL_MS));
    }, QUOTA_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (subscription !== undefined) {
      setRefreshedSubscription(subscription);
    }
  }, [subscription]);

  useEffect(() => {
    let active = true;

    void convex
      .query(api.subscriptions.getMySubscription, { timeBucket })
      .then((result) => {
        if (active) setRefreshedSubscription(result);
      })
      .catch(() => {
        // Older backends accept only {}. Keep the reactive fallback until the
        // optional timeBucket validator is deployed.
      });

    return () => {
      active = false;
    };
  }, [convex, timeBucket]);

  return refreshedSubscription ?? subscription;
}
