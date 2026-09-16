"use server";
import { AuthError } from "next-auth";
import { signIn } from "../../../auth.ts";

export async function authenticate(_state: string, formData: FormData): Promise<string> {
  try {
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/admin" });
    return "";
  } catch (error) {
    if (error instanceof AuthError) return "Unable to sign in with those details.";
    throw error;
  }
}

