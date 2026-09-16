import { findTechnique } from "../content/decoration-techniques.ts";

export const ENQUIRY_SUBJECT_MAX_LENGTH = 160;

/** Only canonical technique slugs may supply a subject through bookmarked/CTA URLs. */
export function subjectFromTechnique(value: unknown): string {
  const technique = findTechnique(value);
  return technique ? `${technique.title} enquiry` : "";
}

export function hasUnsafeSubjectControls(value: string): boolean {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029;
  });
}
