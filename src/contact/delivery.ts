import "server-only";
import nodemailer from "nodemailer";
import { buildEnquiryMessage, type Enquiry } from "./enquiry.ts";

/** Uses the same staff mailbox and SMTP configuration as quote notifications. */
export async function sendContactEnquiry(enquiry: Enquiry): Promise<void> {
  const { SMTP_HOST: host, SMTP_PORT: portValue, SMTP_FROM: from, CXA_QUOTE_NOTIFICATION_EMAIL: to, SMTP_USER: user, SMTP_PASSWORD: pass } = process.env;
  const port = Number(portValue);
  if (!host || !from || !to || !Number.isInteger(port) || port < 1 || port > 65535 || Boolean(user) !== Boolean(pass)) throw new Error("Contact email is not configured.");
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined, connectionTimeout: 10_000, socketTimeout: 15_000 });
  const result = await transport.sendMail({ from, to, ...buildEnquiryMessage(enquiry), disableFileAccess: true, disableUrlAccess: true });
  if (!result.accepted?.length) throw new Error("Contact email was not accepted.");
}
