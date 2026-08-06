export type SourceId = "simplify" | "underclassmen";

export interface Listing {
  id: string;
  source: SourceId;
  sourceLabel: string;
  company: string;
  role: string;
  location: string;
  url: string;
  category?: string;
  datePosted: string; // YYYY-MM-DD
  active?: boolean;
}

export interface DayBucket {
  date: string;
  listings: Listing[];
  bySource: Record<SourceId, number>;
}
