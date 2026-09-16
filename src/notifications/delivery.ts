import "server-only";
import nodemailer from "nodemailer";
import type { NotificationType } from "../generated/prisma/client.ts";
import { database } from "../lib/database.ts";
import { notificationEnabled } from "./policy.ts";

function smtp() { const host = process.env.SMTP_HOST; const port = Number(process.env.SMTP_PORT); const from = process.env.SMTP_FROM; if (!host || !Number.isInteger(port) || !from) return null; const user = process.env.SMTP_USER; const password = process.env.SMTP_PASSWORD; if (Boolean(user) !== Boolean(password)) return null; return { host, port, from, user, password }; }
export async function deliverNotification(input: { quoteId: string; proofId?: string; type: NotificationType; recipientType: "CUSTOMER" | "STAFF"; to: string; replyTo?: string; subject: string; text: string; simulate?: boolean }) {
  let status: "SENT" | "FAILED" | "SKIPPED" = "SKIPPED"; let safeErrorSummary: string | null = null;
  if (await notificationEnabled(input.type)) {
    const configuration = smtp();
    if (configuration && !input.simulate) try { const transporter = nodemailer.createTransport({ host: configuration.host, port: configuration.port, secure: configuration.port === 465, auth: configuration.user ? { user: configuration.user, pass: configuration.password } : undefined }); await transporter.sendMail({ from: configuration.from, to: input.to, replyTo: input.replyTo, subject: input.subject, text: input.text }); status = "SENT"; } catch { status = "FAILED"; safeErrorSummary = "Email provider rejected or could not deliver the message."; }
  }
  return database.notificationDelivery.create({ data: { quoteId: input.quoteId, proofId: input.proofId, type: input.type, recipientType: input.recipientType, status, sentAt: status === "SENT" ? new Date() : null, safeErrorSummary } });
}
