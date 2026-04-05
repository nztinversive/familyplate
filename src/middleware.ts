import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export const middleware = convexAuthNextjsMiddleware();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
