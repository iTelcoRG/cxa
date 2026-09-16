/** Leave breathing room below the entire card; never pin partially readable content. */
export function canStackCards(viewportHeight: number, headerHeight: number, cardHeights: number[], gap: number): boolean {
  return cardHeights.length > 0 && Number.isFinite(gap) && cardHeights.every(height => height > 0 && height + headerHeight + gap * 2 <= viewportHeight);
}
