#!/usr/bin/env node
/**
 * Daily digest: big-tech internships posted today → email.
 * Runs in GitHub Actions. Needs RESEND_API_KEY secret.
 */

const SIMPLIFY_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";

const UNDERCLASSMEN_URL =
  "https://raw.githubusercontent.com/Jose-Gael-Cruz-Lopez/underclassmen-opportunities/main/README.md";

const EMAIL_TO = (
  process.env.EMAIL_TO || "inezaodon1@gmail.com,oineza@nd.edu"
)
  .split(",")
  .map((addr) => addr.trim())
  .filter(Boolean);
const TIMEZONE = process.env.DIGEST_TIMEZONE || "America/New_York";

const BIG_TECH = [
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

const MONTHS = {
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

function todayInTz(tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toIsoDate(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function normalizeCompany(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9&\s.+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchBigTech(company) {
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

function parseUnderclassmenDate(raw) {
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

function extractHref(cell) {
  const md = cell.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
  if (md) return md[1];
  const href = cell.match(/href=["'](https?:\/\/[^"']+)["']/i);
  if (href) return href[1];
  const bare = cell.match(/(https?:\/\/[^\s|<]+)/);
  return bare?.[1] ?? "";
}

function stripCell(cell) {
  return cell
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/✅|❌|🔒/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMarkdownTables(markdown) {
  const listings = [];
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
        listings.push({
          company,
          role,
          location: location || "—",
          url,
          datePosted,
          source: "Underclassmen",
          active: true,
        });
      }
      i += 1;
    }
  }

  return listings;
}

async function fetchSimplify() {
  const res = await fetch(SIMPLIFY_URL);
  if (!res.ok) throw new Error(`Simplify fetch failed (${res.status})`);
  const data = await res.json();
  return data
    .filter((row) => row.is_visible !== false && row.date_posted && row.active)
    .map((row) => ({
      company: (row.company_name || "").trim(),
      role: (row.title || "").trim(),
      location: (row.locations ?? []).join(", ") || "—",
      url: row.url || "",
      datePosted: toIsoDate(row.date_posted),
      source: "Simplify",
      category: row.category,
      active: true,
    }))
    .filter((l) => l.company && l.role);
}

async function fetchUnderclassmen() {
  const res = await fetch(UNDERCLASSMEN_URL);
  if (!res.ok) throw new Error(`Underclassmen fetch failed (${res.status})`);
  return parseMarkdownTables(await res.text());
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmail(date, groups) {
  const total = groups.reduce((n, g) => n + g.listings.length, 0);
  const subject =
    total === 0
      ? `Big tech internships — none new on ${date}`
      : `Big tech internships — ${total} new on ${date}`;

  const rows =
    total === 0
      ? `<p style="color:#3d534c;">No new big-tech internship posts were found for ${escapeHtml(date)}.</p>`
      : groups
          .map((g) => {
            const items = g.listings
              .map((l) => {
                const link = l.url
                  ? `<a href="${escapeHtml(l.url)}" style="color:#0b6e5f;">Apply</a>`
                  : "";
                return `<li style="margin:0 0 0.65rem;">
                  <strong>${escapeHtml(l.role)}</strong><br/>
                  <span style="color:#3d534c;font-size:14px;">${escapeHtml(l.location)} · ${escapeHtml(l.source)}${l.category ? ` · ${escapeHtml(l.category)}` : ""}</span>
                  ${link ? `<br/>${link}` : ""}
                </li>`;
              })
              .join("");
            return `<h2 style="font-size:18px;margin:1.4rem 0 0.5rem;color:#10241f;">${escapeHtml(g.company)} <span style="color:#3d534c;font-weight:500;">(${g.listings.length})</span></h2><ul style="padding-left:1.1rem;margin:0;">${items}</ul>`;
          })
          .join("");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#eef4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#10241f;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 24px;border:1px solid rgba(16,36,31,0.1);">
    <p style="margin:0 0 0.35rem;color:#0b6e5f;font-weight:600;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">ndpeeps CS internships</p>
    <h1 style="margin:0 0 0.5rem;font-size:24px;line-height:1.2;">Big tech posts — ${escapeHtml(date)}</h1>
    <p style="margin:0 0 1.25rem;color:#3d534c;">Daily digest of big-tech / trading firm internships posted today.</p>
    ${rows}
    <p style="margin:2rem 0 0;padding-top:1rem;border-top:1px solid rgba(16,36,31,0.1);font-size:13px;color:#3d534c;">
      Sources: SimplifyJobs Summer Internships + Underclassmen Opportunities.
    </p>
  </div>
</body></html>`;

  const text =
    total === 0
      ? `No new big-tech internship posts for ${date}.`
      : groups
          .map(
            (g) =>
              `${g.company}\n` +
              g.listings
                .map((l) => `- ${l.role} (${l.location}) ${l.url || ""}`)
                .join("\n"),
          )
          .join("\n\n");

  return { subject, html, text };
}

async function sendWithResend({ subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY. Add it as a GitHub Actions secret to enable email delivery.",
    );
  }

  const from = process.env.EMAIL_FROM || "ndpeeps CS Internships <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: EMAIL_TO,
      subject,
      html,
      text,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
  console.log("Email sent to", EMAIL_TO.join(", "), "→", body);
}

async function main() {
  const date = process.env.DIGEST_DATE || todayInTz(TIMEZONE);
  console.log(
    `Building big-tech digest for ${date} (${TIMEZONE}) → ${EMAIL_TO.join(", ")}`,
  );

  const [simplify, under] = await Promise.all([fetchSimplify(), fetchUnderclassmen()]);
  const todays = [...simplify, ...under].filter((l) => l.datePosted === date);

  const byCompany = new Map();
  for (const listing of todays) {
    const matched = matchBigTech(listing.company);
    if (!matched) continue;
    const bucket = byCompany.get(matched) ?? [];
    bucket.push({ ...listing, company: matched });
    byCompany.set(matched, bucket);
  }

  const groups = [...byCompany.entries()]
    .map(([company, listings]) => ({
      company,
      listings: listings.sort((a, b) => a.role.localeCompare(b.role)),
    }))
    .sort((a, b) => b.listings.length - a.listings.length || a.company.localeCompare(b.company));

  const total = groups.reduce((n, g) => n + g.listings.length, 0);
  console.log(`Found ${total} big-tech listing(s) across ${groups.length} company group(s).`);

  const email = buildEmail(date, groups);

  if (process.env.DRY_RUN === "1") {
    console.log("DRY_RUN=1 — skipping send.");
    console.log("Subject:", email.subject);
    console.log(email.text);
    return;
  }

  await sendWithResend(email);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
