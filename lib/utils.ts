const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV;

export const isProd = env === "production";
export const isDev = !isProd;

type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}
