"use client";
import { useUser } from "@clerk/nextjs";
import { clerkEnabled } from "./authEnv";

// Returns the logged-in designer's id, or "anon" when auth is not configured.
// `clerkEnabled` is a build-time constant, so the hook order never changes.
export function useDesignerId(): string {
  if (!clerkEnabled) return "anon";
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user } = useUser();
  return user?.id ?? "anon";
}
