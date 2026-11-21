import "server-only";
import { Google } from "arctic";

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function google() {
  const origin = process.env.TABYL_ORIGIN ?? "http://localhost:3000";
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${origin}/auth/google/callback`);
}
