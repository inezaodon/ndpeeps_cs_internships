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

function renderListingItem(l, { highlight = false } = {}) {
  const link = l.url
    ? `<a href="${escapeHtml(l.url)}" style="color:${highlight ? "#1d4f8c" : "#0b6e5f"};font-weight:600;">Apply →</a>`
    : "";
  const wrapStyle = highlight
    ? "margin:0 0 0.75rem;padding:0.75rem 0.85rem;background:#eef4fb;border-left:4px solid #1d4f8c;border-radius:6px;list-style:none;"
    : "margin:0 0 0.65rem;";
  return `<li style="${wrapStyle}">
    <strong>${escapeHtml(l.company)}</strong> — ${escapeHtml(l.role)}<br/>
    <span style="color:#3d534c;font-size:14px;">${escapeHtml(l.location)} · ${escapeHtml(l.source)}${l.category ? ` · ${escapeHtml(l.category)}` : ""}</span>
    ${link ? `<br/>${link}` : ""}
  </li>`;
}

function buildEmail(date, { bigTechGroups, underclassmenListings }) {
  const bigTechTotal = bigTechGroups.reduce((n, g) => n + g.listings.length, 0);
  const underTotal = underclassmenListings.length;
  const total = bigTechTotal + underTotal;

  const subject =
    total === 0
      ? `Internship digest — nothing new on ${date}`
      : `Internship digest — ${bigTechTotal} big tech, ${underTotal} underclassmen on ${date}`;

  const underSection =
    underTotal === 0
      ? `<p style="color:#3d534c;margin:0;">No new underclassmen-opportunity posts for ${escapeHtml(date)}.</p>`
      : `<ul style="padding:0;margin:0;list-style:none;">${underclassmenListings
          .map((l) => renderListingItem(l, { highlight: true }))
          .join("")}</ul>`;

  const bigTechSection =
    bigTechTotal === 0
      ? `<p style="color:#3d534c;">No new big-tech internship posts for ${escapeHtml(date)}.</p>`
      : bigTechGroups
          .map((g) => {
            const items = g.listings
              .map((l) =>
                renderListingItem(l, {
                  highlight: l.source === "Underclassmen",
                }),
              )
              .join("");
            return `<h3 style="font-size:17px;margin:1.2rem 0 0.45rem;color:#10241f;">${escapeHtml(g.company)} <span style="color:#3d534c;font-weight:500;">(${g.listings.length})</span></h3><ul style="padding-left:1.1rem;margin:0;${g.listings.some((l) => l.source === "Underclassmen") ? "list-style:none;padding-left:0;" : ""}">${items}</ul>`;
          })
          .join("");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#eef4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#10241f;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 24px;border:1px solid rgba(16,36,31,0.1);">
    <p style="margin:0 0 0.35rem;color:#0b6e5f;font-weight:600;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">ndpeeps CS internships</p>
    <h1 style="margin:0 0 0.5rem;font-size:24px;line-height:1.2;">Daily digest — ${escapeHtml(date)}</h1>
    <p style="margin:0 0 1.25rem;color:#3d534c;">Big-tech roles plus underclassmen opportunities posted today. Underclassmen listings are highlighted in blue.</p>

    <div style="margin:0 0 1.75rem;padding:1rem 1.1rem;background:linear-gradient(180deg,#f3f7fc 0%,#eef4fb 100%);border:1px solid rgba(29,79,140,0.25);border-radius:10px;">
      <h2 style="font-size:18px;margin:0 0 0.35rem;color:#1d4f8c;">Underclassmen opportunities · ${underTotal}</h2>
      <p style="margin:0 0 0.9rem;color:#3d534c;font-size:14px;">From the Underclassmen Opportunities list — highlighted for quick scanning.</p>
      ${underSection}
    </div>

    <h2 style="font-size:18px;margin:0 0 0.5rem;color:#10241f;">Big tech · ${bigTechTotal}</h2>
    <p style="margin:0 0 0.75rem;color:#3d534c;font-size:14px;">Major tech / trading firms from both sources.</p>
    ${bigTechSection}

    <p style="margin:2rem 0 0;padding-top:1rem;border-top:1px solid rgba(16,36,31,0.1);font-size:13px;color:#3d534c;">
      Sources: SimplifyJobs Summer Internships + Underclassmen Opportunities.
    </p>
  </div>
</body></html>`;

  const textParts = [
    `Daily digest — ${date}`,
    "",
    `UNDERCLASSMEN (${underTotal})`,
    underTotal === 0
      ? "No new underclassmen posts."
      : underclassmenListings
          .map((l) => `★ ${l.company} — ${l.role} (${l.location}) ${l.url || ""}`)
          .join("\n"),
    "",
    `BIG TECH (${bigTechTotal})`,
    bigTechTotal === 0
      ? "No new big-tech posts."
      : bigTechGroups
          .map(
            (g) =>
              `${g.company}\n` +
              g.listings
                .map((l) => `- ${l.role} (${l.location}) [${l.source}] ${l.url || ""}`)
                .join("\n"),
          )
          .join("\n\n"),
  ];

  return { subject, html, text: textParts.join("\n") };
}

async function sendWithResend({ subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY. Add it as a GitHub Actions secret to enable email delivery.",
    );
  }

  const from = process.env.EMAIL_FROM || "ndpeeps CS Internships <onboarding@resend.dev>";
  const results = [];
  const failures = [];

  // Send one recipient at a time so a blocked address (e.g. unverified domain)
  // does not prevent delivery to the others.
  for (const to of EMAIL_TO) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`Resend failed for ${to} (${res.status}): ${body}`);
      failures.push(`${to}: ${body}`);
      continue;
    }
    console.log("Email sent to", to, "→", body);
    results.push(to);
  }

  if (results.length === 0) {
    throw new Error(`Resend failed for all recipients. ${failures.join(" | ")}`);
  }

  if (failures.length > 0) {
    console.warn(
      `Partial send: delivered to ${results.join(", ")}. Failed: ${failures.join(" | ")}`,
    );
  }
}

async function main() {
  const date = process.env.DIGEST_DATE || todayInTz(TIMEZONE);
  console.log(
    `Building internship digest for ${date} (${TIMEZONE}) → ${EMAIL_TO.join(", ")}`,
  );

  const [simplify, under] = await Promise.all([fetchSimplify(), fetchUnderclassmen()]);
  const todays = [...simplify, ...under].filter((l) => l.datePosted === date);

  const underclassmenListings = todays
    .filter((l) => l.source === "Underclassmen")
    .sort((a, b) => a.company.localeCompare(b.company) || a.role.localeCompare(b.role));

  const byCompany = new Map();
  for (const listing of todays) {
    const matched = matchBigTech(listing.company);
    if (!matched) continue;
    const bucket = byCompany.get(matched) ?? [];
    bucket.push({ ...listing, company: matched });
    byCompany.set(matched, bucket);
  }

  const bigTechGroups = [...byCompany.entries()]
    .map(([company, listings]) => ({
      company,
      listings: listings.sort((a, b) => a.role.localeCompare(b.role)),
    }))
    .sort((a, b) => b.listings.length - a.listings.length || a.company.localeCompare(b.company));

  console.log(
    `Found ${bigTechGroups.reduce((n, g) => n + g.listings.length, 0)} big-tech and ${underclassmenListings.length} underclassmen listing(s).`,
  );

  const email = buildEmail(date, { bigTechGroups, underclassmenListings });

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
