import "server-only";

import nodemailer from "nodemailer";

export interface NotificationQuote {
  quoteNumber: string;
  customerName: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  requiredBy: Date | null;
  deliveryMethod: string | null;
  customerNotes: string | null;
  totalGarments: number;
  artworkFiles: string[];
  lines: Array<{
    productName: string;
    colourDescription: string;
    customerNotes: string | null;
    sizes: Array<{ size: string; quantity: number }>;
    decorations: Array<{
      locationLabel: string;
      methodLabel: string;
      customerNote: string | null;
    }>;
  }>;
}

export interface NotificationAttempt {
  staff: "sent" | "failed" | "skipped";
  customer: "sent" | "failed" | "skipped";
}

function dateLabel(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "Not specified";
}

export function buildStaffNotification(quote: NotificationQuote): {
  subject: string;
  text: string;
} {
  const lineText = quote.lines
    .map((line, index) => {
      const sizes = line.sizes.map((item) => `${item.size} x ${item.quantity}`).join(", ");
      const decorations = line.decorations
        .map((item) =>
          `${item.locationLabel}: ${item.methodLabel}${item.customerNote ? ` (${item.customerNote})` : ""}`,
        )
        .join("; ");
      return [
        `${index + 1}. ${line.productName}`,
        `Colour: ${line.colourDescription}`,
        `Sizes: ${sizes}`,
        `Decoration: ${decorations}`,
        line.customerNotes ? `Configuration note: ${line.customerNotes}` : null,
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");

  return {
    subject: `New CXA Quote Request - ${quote.quoteNumber}`,
    text: [
      `Quote number: ${quote.quoteNumber}`,
      `Customer: ${quote.customerName}`,
      `Business: ${quote.businessName ?? "Not supplied"}`,
      `Email: ${quote.email}`,
      `Phone: ${quote.phone ?? "Not supplied"}`,
      `Required by: ${dateLabel(quote.requiredBy)}`,
      `Delivery method: ${quote.deliveryMethod ?? "Not specified"}`,
      `Total garments: ${quote.totalGarments}`,
      `Additional notes: ${quote.customerNotes ?? "None"}`,
      `Artwork files received: ${quote.artworkFiles.length ? quote.artworkFiles.join(", ") : "None"}`,
      "",
      "Configurations",
      lineText,
    ].join("\n"),
  };
}

export function buildCustomerConfirmation(quote: NotificationQuote): {
  subject: string;
  text: string;
} {
  return {
    subject: `We've received your CXA quote request - ${quote.quoteNumber}`,
    text: [
      `Hi ${quote.customerName},`,
      "",
      `We've received your quote request ${quote.quoteNumber}.`,
      "No payment has been taken.",
      "CXA will review product availability, artwork and branding requirements. Final pricing will follow.",
      `Artwork files received: ${quote.artworkFiles.length ? quote.artworkFiles.join(", ") : "None"}`,
      "",
      "Thanks,",
      "CXA — Custom X Apparel",
    ].join("\n"),
  };
}

function smtpConfiguration() {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const from = process.env.SMTP_FROM;
  const staffTo = process.env.CXA_QUOTE_NOTIFICATION_EMAIL;
  if (!host || !portValue || !from || !staffTo) return null;
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(password)) return null;
  return { host, port, from, staffTo, user, password };
}

export async function sendQuoteNotifications(
  quote: NotificationQuote,
  target: "both" | "staff" | "customer" = "both",
): Promise<NotificationAttempt> {
  const configuration = smtpConfiguration();
  const { notificationEnabled } = await import("../notifications/policy.ts");
  const [staffEnabled, customerEnabled] = await Promise.all([notificationEnabled("STAFF_QUOTE_NOTIFICATION"), notificationEnabled("CUSTOMER_ACKNOWLEDGEMENT")]);
  if (!configuration) {
    console.info("Quote notification skipped: email not configured.");
    return { staff: "skipped", customer: "skipped" };
  }

  const transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.port === 465,
    auth: configuration.user
      ? { user: configuration.user, pass: configuration.password }
      : undefined,
  });
  const staff = buildStaffNotification(quote);
  const customer = buildCustomerConfirmation(quote);
  let staffStatus: NotificationAttempt["staff"] = target === "customer" || !staffEnabled ? "skipped" : "sent";
  let customerStatus: NotificationAttempt["customer"] = target === "staff" || !customerEnabled ? "skipped" : "sent";

  if (target !== "customer" && staffEnabled) try {
    await transporter.sendMail({
      from: configuration.from,
      to: configuration.staffTo,
      replyTo: quote.email,
      ...staff,
    });
  } catch {
    staffStatus = "failed";
  }
  if (target !== "staff" && customerEnabled) try {
    await transporter.sendMail({
      from: configuration.from,
      to: quote.email,
      ...customer,
    });
  } catch {
    customerStatus = "failed";
  }
  return { staff: staffStatus, customer: customerStatus };
}
