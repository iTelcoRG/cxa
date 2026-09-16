"use server";

import { redirect } from "next/navigation";
import { respondToProof } from "../../../operations/proofs.ts";

export async function submitProofResponse(token: string, formData: FormData) {
  const decision = formData.get("decision");
  if (decision !== "APPROVED" && decision !== "REJECTED") throw new Error("Invalid proof response.");
  const ok = await respondToProof(token, decision, String(formData.get("note") ?? ""));
  redirect(`/proof/${encodeURIComponent(token)}?result=${ok ? decision.toLowerCase() : "unavailable"}`);
}
