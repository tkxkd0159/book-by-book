import type { DefaultSession } from "next-auth";

import type { AppSessionIdentity } from "@/types/auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      nickname?: string | null;
      provider?: string;
      sessionIdentity?: AppSessionIdentity;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    nickname?: string | null;
    provider?: string;
    sessionIdentity?: AppSessionIdentity;
    userId?: string;
  }
}
