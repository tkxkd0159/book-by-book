const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV;

export const isProd = env === "production";
export const isDev = !isProd;
