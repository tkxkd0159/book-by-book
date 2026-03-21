import type { DefaultSession } from "next-auth";

import type { AppSessionIdentity } from "@/types/db";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      isInternalAdmin?: boolean;
      isSignupComplete?: boolean;
      nickname?: string | null;
      provider?: string;
      sessionIdentity?: AppSessionIdentity;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isInternalAdmin?: boolean;
    isSignupComplete?: boolean;
    nickname?: string | null;
    provider?: string;
    sessionIdentity?: AppSessionIdentity;
    userId?: string;
  }
}
