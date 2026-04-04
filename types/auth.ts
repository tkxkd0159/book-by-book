import type { UserRecord } from "@/types/db";

type AppSessionIdentity = "PUBLIC_INCOMPLETE" | "PUBLIC" | "INTERNAL_ADMIN";

type AuthUser = Omit<UserRecord, "passwordHash">;

type InternalAdminCredentialsUser = UserRecord;

export type {
  AppSessionIdentity,
  AuthUser,
  InternalAdminCredentialsUser,
};
