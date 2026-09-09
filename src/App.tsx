import { useEffect, useMemo, useState } from "react";
import { filterAiListings, groupByBigTech } from "./classify";
import { formatDayLabel, groupByDay } from "./group";
import { fetchAllListings } from "./sources";
import type { Listing, SourceId } from "./types";

type Tab = "daily" | "big-tech" | "ai";
type Filter = "all" | SourceId | "active-only";

function ListingRow({ listing, showDate = true }: { listing: Listing; showDate?: boolean }) {
  return (
    <a
      className="listing"
      href={listing.url || undefined}
      target={listing.url ? "_blank" : undefined}
      rel={listing.url ? "noreferrer" : undefined}
      onClick={(e) => {
        if (!listing.url) e.preventDefault();
      }}
    >
      <span className={`badge ${listing.source}`}>
        {listing.source === "simplify" ? "Simplify" : "Underclassmen"}
      </span>
      <div className="listing-main">
        <p className="listing-company">{listing.company}</p>
        <p className="listing-role">{listing.role}</p>
        <p className="listing-meta">
          {listing.location}
          {listing.category ? ` · ${listing.category}` : ""}
          {showDate ? ` · ${formatDayLabel(listing.datePosted)}` : ""}
          {listing.source === "simplify" && listing.active === false ? " · closed" : ""}
        </p>
      </div>
      {listing.url ? <span className="listing-link">Apply →</span> : null}
    </a>
  );
}

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("daily");
  const [filter, setFilter] = useState<Filter>("active-only");
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [openCompanies, setOpenCompanies] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllListings();
      setListings(data);
      setRefreshedAt(new Date());
      const newest = [...data]
        .map((l) => l.datePosted)
        .sort()
        .at(-1);
      if (newest) setOpenDays({ [newest]: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const basePool = useMemo(() => {
    return listings.filter((l) => {
      if (filter === "simplify" || filter === "underclassmen") return l.source === filter;
      if (filter === "active-only") return l.active !== false;
      return true;
    });
  }, [listings, filter]);

  const days = useMemo(() => groupByDay(basePool), [basePool]);
  const bigTechGroups = useMemo(() => groupByBigTech(basePool), [basePool]);
  const aiListings = useMemo(() => filterAiListings(basePool), [basePool]);

  const stats = useMemo(() => {
    const simplify = listings.filter((l) => l.source === "simplify").length;
    const under = listings.filter((l) => l.source === "underclassmen").length;
    const activeSimplify = listings.filter((l) => l.source === "simplify" && l.active).length;
    return {
      total: listings.length,
      simplify,
      under,
      activeSimplify,
      dayCount: days.length,
      bigTechCompanies: bigTechGroups.length,
      bigTechRoles: bigTechGroups.reduce((n, g) => n + g.listings.length, 0),
      aiCount: aiListings.length,
    };
  }, [listings, days.length, bigTechGroups, aiListings.length]);

  useEffect(() => {
    if (tab === "big-tech" && bigTechGroups[0] && Object.keys(openCompanies).length === 0) {
      setOpenCompanies({ [bigTechGroups[0].company]: true });
    }
  }, [tab, bigTechGroups, openCompanies]);

  function toggleDay(date: string) {
    setOpenDays((prev) => ({ ...prev, [date]: !prev[date] }));
  }

  function toggleCompany(company: string) {
    setOpenCompanies((prev) => ({ ...prev, [company]: !prev[company] }));
  }

  return (
    <div className="app">
      <header className="hero">
        <h1 className="brand">Internship Daily Tracker</h1>
        <p className="lede">
          A personal log of roles from SimplifyJobs and Underclassmen Opportunities — by day,
          big tech, or AI-focused roles.
        </p>
        <p className="email-note">
          Daily email digest: big-tech posts from each day are sent to{" "}
          <strong>inezaodon1@gmail.com</strong> every morning.
        </p>
      </header>

      <nav className="tabs" role="tablist" aria-label="Views">
        {(
          [
            ["daily", "By day"],
            ["big-tech", "Big tech"],
            ["ai", "AI roles"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter listings">
          {(
            [
              ["all", "All sources"],
              ["active-only", "Simplify active"],
              ["simplify", "SimplifyJobs"],
              ["underclassmen", "Underclassmen"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="meta">
          {refreshedAt && (
            <span>
              Pulled {refreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <button type="button" className="refresh" onClick={() => void load()} disabled={loading}>
            {loading ? "Pulling…" : "Refresh"}
          </button>
        </div>
      </div>

      {!loading && !error && tab === "daily" && (
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{stats.dayCount}</div>
            <div className="stat-label">Days with posts</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.simplify}</div>
            <div className="stat-label">Simplify listings</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.activeSimplify}</div>
            <div className="stat-label">Still open (Simplify)</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.under}</div>
            <div className="stat-label">Underclassmen rows</div>
          </div>
        </div>
      )}

      {!loading && !error && tab === "big-tech" && (
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{stats.bigTechCompanies}</div>
            <div className="stat-label">Big tech companies</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.bigTechRoles}</div>
            <div className="stat-label">Matching roles</div>
          </div>
        </div>
      )}

      {!loading && !error && tab === "ai" && (
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{stats.aiCount}</div>
            <div className="stat-label">AI-related roles</div>
          </div>
        </div>
      )}

      {loading && <div className="status">Pulling latest listings from both repos…</div>}
      {error && <div className="status error">{error}</div>}

      {!loading && !error && tab === "daily" && days.length === 0 && (
        <p className="empty">No listings match this filter.</p>
      )}

      {!loading && !error && tab === "big-tech" && bigTechGroups.length === 0 && (
        <p className="empty">No big tech listings match this filter.</p>
      )}

      {!loading && !error && tab === "ai" && aiListings.length === 0 && (
        <p className="empty">No AI-related listings match this filter.</p>
      )}

      {tab === "daily" && (
        <div className="days" role="tabpanel">
          {days.map((day) => {
            const open = Boolean(openDays[day.date]);
            return (
              <section key={day.date} className="day" data-open={open}>
                <button
                  type="button"
                  className="day-toggle"
                  aria-expanded={open}
                  onClick={() => toggleDay(day.date)}
                >
                  <div>
                    <h2 className="day-date">{formatDayLabel(day.date)}</h2>
                    <div className="day-summary">
                      <span>
                        {day.listings.length} listing{day.listings.length === 1 ? "" : "s"}
                      </span>
                      {day.bySource.simplify > 0 && (
                        <span className="badge simplify">Simplify · {day.bySource.simplify}</span>
                      )}
                      {day.bySource.underclassmen > 0 && (
                        <span className="badge underclassmen">
                          Underclassmen · {day.bySource.underclassmen}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="chevron" aria-hidden>
                    ▾
                  </span>
                </button>

                {open && (
                  <div className="listings">
                    {day.listings.map((listing) => (
                      <ListingRow key={listing.id} listing={listing} showDate={false} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {tab === "big-tech" && (
        <div className="days" role="tabpanel">
          {bigTechGroups.map((group) => {
            const open = Boolean(openCompanies[group.company]);
            return (
              <section key={group.company} className="day" data-open={open}>
                <button
                  type="button"
                  className="day-toggle"
                  aria-expanded={open}
                  onClick={() => toggleCompany(group.company)}
                >
                  <div>
                    <h2 className="day-date">{group.company}</h2>
                    <div className="day-summary">
                      <span>
                        {group.listings.length} role{group.listings.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <span className="chevron" aria-hidden>
                    ▾
                  </span>
                </button>

                {open && (
                  <div className="listings">
                    {group.listings.map((listing) => (
                      <ListingRow key={listing.id} listing={listing} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {tab === "ai" && (
        <div className="listings flat-list" role="tabpanel">
          {aiListings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
