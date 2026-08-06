import type { Listing } from "./types";

/** Normalized company aliases → display name */
const BIG_TECH: Array<{ name: string; aliases: string[] }> = [
  { name: "Google", aliases: ["google", "alphabet", "youtube", "deepmind", "waymo"] },
  { name: "Meta", aliases: ["meta", "facebook", "instagram"] },
  { name: "Apple", aliases: ["apple"] },
  { name: "Amazon", aliases: ["amazon", "aws", "amazon web services"] },
  { name: "Microsoft", aliases: ["microsoft", "linkedin", "github", "xbox"] },
  { name: "Netflix", aliases: ["netflix"] },
  { name: "NVIDIA", aliases: ["nvidia"] },
  { name: "OpenAI", aliases: ["openai"] },
  { name: "Anthropic", aliases: ["anthropic"] },
  { name: "Tesla", aliases: ["tesla"] },
  { name: "Uber", aliases: ["uber"] },
  { name: "Airbnb", aliases: ["airbnb"] },
  { name: "Stripe", aliases: ["stripe"] },
  { name: "Salesforce", aliases: ["salesforce", "slack technologies"] },
  { name: "Oracle", aliases: ["oracle"] },
  { name: "IBM", aliases: ["ibm"] },
  { name: "Intel", aliases: ["intel"] },
  { name: "Adobe", aliases: ["adobe"] },
  { name: "Bloomberg", aliases: ["bloomberg"] },
  { name: "Palantir", aliases: ["palantir"] },
  { name: "Snowflake", aliases: ["snowflake"] },
  { name: "Databricks", aliases: ["databricks"] },
  { name: "Cloudflare", aliases: ["cloudflare"] },
  { name: "Spotify", aliases: ["spotify"] },
  { name: "Snap", aliases: ["snap", "snapchat", "snap inc"] },
  { name: "TikTok", aliases: ["tiktok", "bytedance", "byte dance"] },
  { name: "Shopify", aliases: ["shopify"] },
  { name: "Block", aliases: ["block inc", "square", "cash app"] },
  { name: "Coinbase", aliases: ["coinbase"] },
  { name: "Robinhood", aliases: ["robinhood"] },
  { name: "Jane Street", aliases: ["jane street"] },
  { name: "Citadel", aliases: ["citadel"] },
  { name: "Two Sigma", aliases: ["two sigma"] },
  { name: "Jump Trading", aliases: ["jump trading", "jump trading group"] },
  { name: "HRT", aliases: ["hudson river trading", "hrt"] },
  { name: "DE Shaw", aliases: ["d. e. shaw", "de shaw", "deshaw"] },
];

const AI_KEYWORDS = [
  "ai",
  "a.i.",
  "artificial intelligence",
  "machine learning",
  "ml ",
  " ml",
  "deep learning",
  "llm",
  "nlp",
  "computer vision",
  "data science",
  "data scientist",
  "generative",
  "neural",
  "robotics",
  "research scientist",
  "applied scientist",
  "foundation model",
  "transformer",
];

function normalizeCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9&\s.+-]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchBigTech(company: string): string | null {
  const n = normalizeCompany(company);
  if (!n) return null;

  for (const entry of BIG_TECH) {
    for (const alias of entry.aliases) {
      if (n === alias) return entry.name;
      if (n.startsWith(`${alias} `) || n.startsWith(`${alias}.`)) return entry.name;
      if (n.includes(` ${alias} `) || n.endsWith(` ${alias}`)) return entry.name;
    }
  }
  return null;
}

export function isAiRelated(listing: Listing): boolean {
  const category = (listing.category ?? "").toLowerCase();
  if (
    category.includes("ai") ||
    category.includes("ml") ||
    category.includes("data") ||
    category.includes("machine")
  ) {
    return true;
  }

  const hay = `${listing.role} ${listing.company}`.toLowerCase();
  return AI_KEYWORDS.some((kw) => {
    if (kw === "ai" || kw === "ml ") {
      return new RegExp(`(^|[^a-z])${kw.trim()}([^a-z]|$)`, "i").test(hay);
    }
    return hay.includes(kw.trim());
  });
}

export interface CompanyGroup {
  company: string;
  listings: Listing[];
}

export function groupByBigTech(listings: Listing[]): CompanyGroup[] {
  const map = new Map<string, Listing[]>();

  for (const listing of listings) {
    const matched = matchBigTech(listing.company);
    if (!matched) continue;
    const bucket = map.get(matched) ?? [];
    bucket.push(listing);
    map.set(matched, bucket);
  }

  return [...map.entries()]
    .map(([company, items]) => ({
      company,
      listings: items.sort((a, b) => b.datePosted.localeCompare(a.datePosted) || a.role.localeCompare(b.role)),
    }))
    .sort((a, b) => b.listings.length - a.listings.length || a.company.localeCompare(b.company));
}

export function filterAiListings(listings: Listing[]): Listing[] {
  return listings
    .filter(isAiRelated)
    .sort((a, b) => b.datePosted.localeCompare(a.datePosted) || a.company.localeCompare(b.company));
}
