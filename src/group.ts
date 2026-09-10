import type { DayBucket, Listing, SourceId } from "./types";

export function groupByDay(listings: Listing[]): DayBucket[] {
  const map = new Map<string, Listing[]>();

  for (const listing of listings) {
    const bucket = map.get(listing.datePosted) ?? [];
    bucket.push(listing);
    map.set(listing.datePosted, bucket);
  }

  const days: DayBucket[] = [];
  for (const [date, dayListings] of map) {
    // Underclassmen first so they stand out in the daily feed
    dayListings.sort((a, b) => {
      if (a.source !== b.source) {
        if (a.source === "underclassmen") return -1;
        if (b.source === "underclassmen") return 1;
      }
      return a.company.localeCompare(b.company);
    });

    const bySource = { simplify: 0, underclassmen: 0 } satisfies Record<SourceId, number>;
    for (const l of dayListings) bySource[l.source] += 1;

    days.push({ date, listings: dayListings, bySource });
  }

  days.sort((a, b) => b.date.localeCompare(a.date));
  return days;
}

export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
