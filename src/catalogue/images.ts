export interface PublicImageSource {
  kind: "HERO" | "COLOUR";
  url: string;
  colourCode?: string | null;
  sortOrder?: number;
}

function validPublicImageUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "ik.imagekit.io" &&
      url.pathname.startsWith("/premiumapparel/")
    );
  } catch {
    return false;
  }
}

export function selectPublicImages(
  primaryImage: string | null | undefined,
  sources: readonly PublicImageSource[],
): string[] {
  const sorted = [...sources].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "HERO" ? -1 : 1;
    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  });
  const candidates = [primaryImage, ...sorted.map((image) => image.url)];

  return [...new Set(candidates.filter(validPublicImageUrl))];
}
