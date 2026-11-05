"use server";

import { signIn, signOut } from "@/auth";

export async function signInWith(provider: "google" | "github", next: string) {
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  await signIn(provider, { redirectTo: safe });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
