import { z } from "zod";
import { ENQUIRY_SUBJECT_MAX_LENGTH, hasUnsafeSubjectControls } from "./subject.ts";

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120).refine(value => !/[\r\n]/.test(value), "Enter a single-line name."),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  subject: z.string().refine(value => !hasUnsafeSubjectControls(value), "Use a single-line subject without control characters.").transform(value => value.trim()).pipe(z.string().min(1, "Enter a subject.").max(ENQUIRY_SUBJECT_MAX_LENGTH, `Keep your subject to ${ENQUIRY_SUBJECT_MAX_LENGTH} characters or fewer.`)),
  message: z.string().trim().min(10, "Tell us a little more about your project (at least 10 characters).").max(5000),
  website: z.string().max(0).default(""),
});
export type Enquiry = z.infer<typeof enquirySchema>;
export function buildEnquiryMessage(enquiry: Enquiry) {
  return {
    subject: `CXA enquiry: ${enquiry.subject}`,
    replyTo: enquiry.email,
    text: [`Name: ${enquiry.name}`, `Email: ${enquiry.email}`, `Subject: ${enquiry.subject}`, "", enquiry.message].join("\n"),
  };
}

export async function submitEnquiry(input: unknown, send: (enquiry: Enquiry) => Promise<void>) {
  const result = enquirySchema.safeParse(input);
  if (!result.success) return { status: 400, body: { error: "Check the form and try again.", fields: result.error.flatten().fieldErrors } };
  try {
    await send(result.data);
    return { status: 200, body: { success: true } };
  } catch {
    return { status: 503, body: { error: "We couldn’t send your enquiry. Your details are still here. Please try again later or email sales@cxa.co.nz." } };
  }
}
