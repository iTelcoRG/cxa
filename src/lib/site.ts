export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "CXA | Custom X Apparel";
export const publicUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
