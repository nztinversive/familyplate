import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Resend from "@auth/core/providers/resend";

const resendConfig = {
  from: "FamilyPlate <noreply@resend.dev>",
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: Resend(resendConfig),
    }),
    Resend(resendConfig),
  ],
});
