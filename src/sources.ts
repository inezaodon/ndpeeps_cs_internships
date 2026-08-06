import type { Listing, SourceId } from "./types";

const SIMPLIFY_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";

const UNDERCLASSMEN_URL =
  "https://raw.githubusercontent.com/Jose-Gael-Cruz-Lopez/underclassmen-opportunities/main/README.md";

interface SimplifyRaw {
  id: string;
  company_name: string;
  title: string;
  url: string;
  locations?: string[];
  category?: string;
  active?: boolean;
  is_visible?: boolean;
  date_posted?: number;
}

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function toIsoDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function parseUnderclassmenDate(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1]];
  if (month === undefined) return null;
  const day = Number(match[2]);
  const year = Number(match[3]);
  const d = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractHref(cell: string): string {
  const md = cell.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
  if (md) return md[1];
  const href = cell.match(/href=["'](https?:\/\/[^"']+)["']/i);
  if (href) return href[1];
  const bare = cell.match(/(https?:\/\/[^\s|<]+)/);
  return bare?.[1] ?? "";
}

function stripCell(cell: string): string {
  return cell
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/✅|❌|🔒/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMarkdownTables(markdown: string): Listing[] {
  const listings: Listing[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const header = lines[i];
    if (!header.includes("|") || !/company/i.test(header)) {
      i += 1;
      continue;
    }

    const headers = header
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => h.toLowerCase());

    const companyIdx = headers.findIndex((h) => h.includes("company"));
    const roleIdx = headers.findIndex(
      (h) => h.includes("role") || h.includes("program") || h.includes("opportunity"),
    );
    const locationIdx = headers.findIndex((h) => h.includes("location"));
    const appIdx = headers.findIndex((h) => h.includes("application") || h.includes("link"));
    const dateIdx = headers.findIndex((h) => h.includes("date"));

    if (companyIdx < 0 || dateIdx < 0) {
      i += 1;
      continue;
    }

    i += 1;
    if (i < lines.length && /^\|?\s*-+/.test(lines[i])) i += 1;

    while (i < lines.length && lines[i].includes("|")) {
      // "| a | b |" → ["", " a ", " b ", ""] — keep middle cells
      const parts = lines[i].split("|").slice(1, -1).map((c) => c.trim());
      if (parts.length < headers.length || /^\s*-+/.test(parts[0] ?? "")) {
        i += 1;
        continue;
      }

      const company = stripCell(parts[companyIdx] ?? "");
      const role = stripCell(parts[roleIdx >= 0 ? roleIdx : companyIdx] ?? company);
      const location = stripCell(parts[locationIdx] ?? "");
      const url = extractHref(parts[appIdx] ?? "");
      const datePosted = parseUnderclassmenDate(stripCell(parts[dateIdx] ?? ""));

      if (company && datePosted) {
        const id = `underclassmen:${company}|${role}|${url || datePosted}`;
        listings.push({
          id,
          source: "underclassmen",
          sourceLabel: "Underclassmen Opportunities",
          company,
          role,
          location: location || "—",
          url,
          datePosted,
          active: true,
        });
      }

      i += 1;
    }
  }

  return listings;
}

export async function fetchSimplifyListings(): Promise<Listing[]> {
  const res = await fetch(SIMPLIFY_URL);
  if (!res.ok) throw new Error(`Simplify fetch failed (${res.status})`);
  const data = (await res.json()) as SimplifyRaw[];

  return data
    .filter((row) => row.is_visible !== false && row.date_posted)
    .map((row) => ({
      id: `simplify:${row.id}`,
      source: "simplify" as SourceId,
      sourceLabel: "SimplifyJobs Summer Internships",
      company: (row.company_name || "").trim(),
      role: (row.title || "").trim(),
      location: (row.locations ?? []).join(", ") || "—",
      url: row.url || "",
      category: row.category,
      datePosted: toIsoDate(row.date_posted!),
      active: Boolean(row.active),
    }))
    .filter((l) => l.company && l.role);
}

export async function fetchUnderclassmenListings(): Promise<Listing[]> {
  const res = await fetch(UNDERCLASSMEN_URL);
  if (!res.ok) throw new Error(`Underclassmen fetch failed (${res.status})`);
  const markdown = await res.text();
  return parseMarkdownTables(markdown);
}

export async function fetchAllListings(): Promise<Listing[]> {
  const [simplify, underclassmen] = await Promise.all([
    fetchSimplifyListings(),
    fetchUnderclassmenListings(),
  ]);
  return [...simplify, ...underclassmen];
}
