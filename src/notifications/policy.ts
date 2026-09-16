import "server-only";
import type { NotificationType } from "../generated/prisma/client.ts";
import { database } from "../lib/database.ts";
type PolicyField = "sendCustomerAcknowledgement" | "sendStaffQuoteNotification" | "sendProofReady" | "sendArtworkRevision" | "sendInProduction" | "sendReady";
const fields: Record<NotificationType, PolicyField> = { CUSTOMER_ACKNOWLEDGEMENT: "sendCustomerAcknowledgement", STAFF_QUOTE_NOTIFICATION: "sendStaffQuoteNotification", ARTWORK_REVISION: "sendArtworkRevision", PROOF_READY: "sendProofReady", IN_PRODUCTION: "sendInProduction", READY: "sendReady" };
export async function settings() { return database.notificationSettings.upsert({ where: { id: "default" }, create: {}, update: {} }); }
export async function notificationEnabled(type: NotificationType) { const current = await settings(); return Boolean(current[fields[type]]); }
