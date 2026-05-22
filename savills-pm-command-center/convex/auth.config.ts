import { AuthConfig } from "convex/server";

if (!process.env.CLERK_JWT_ISSUER_DOMAIN) {
  throw new Error("CLERK_JWT_ISSUER_DOMAIN environment variable is not set");
}

export default {
  providers: [
    {
       domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
       applicationID: "convex",
     },
  ],
} satisfies AuthConfig;
 