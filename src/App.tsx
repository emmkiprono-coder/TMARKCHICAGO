import { useState, useCallback, useEffect } from "react";

/* ───────── JSONBin config ───────── */
const JSONBIN_API_KEY = "$2a$10$M6W9ulyMKcxTdIcDcjhuVOm12ccNO2UeYG9e581pkl4mA3aX5Dvu.";
const SUBMISSIONS_BIN = "69ae1210ae596e708f6e5f1e";
const VOTES_BIN = "69ae121e43b1c97be9c29727";

interface SingleSubmission {
  submitter: string;
  department: string;
  rationale: string;
  unification: string;
  realWorldTest: string;
  culturalSignificance: string;
  tagline: string;
}

interface Finalist {
  id: number;
  name: string;
  submissions: SingleSubmission[];
}

/* ── normalize name for grouping ── */
function normalizeForGrouping(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[''"""\-]/g, "")       // strip quotes, hyphens, apostrophes
    .replace(/\s+/g, " ")            // collapse whitespace
    .replace(/\b(the|team|services?|department|dept|group|unit)\b/g, "") // strip common suffixes
    .replace(/s\b/g, "")             // strip trailing s (plurals)
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSubmissions(): Promise<Finalist[]> {
  let res = await fetch(`https://api.jsonbin.io/v3/b/${SUBMISSIONS_BIN}/latest`);
  if (!res.ok) {
    res = await fetch(`https://api.jsonbin.io/v3/b/${SUBMISSIONS_BIN}/latest`, {
      headers: { "X-Access-Key": JSONBIN_API_KEY },
    });
  }
  if (!res.ok) throw new Error(`Failed to load submissions: ${res.status}`);
  const data = await res.json();
  const records: any[] = Array.isArray(data.record) ? data.record : [];

  /* group similar names */
  const groups = new Map<string, { displayName: string; submissions: SingleSubmission[] }>();

  for (const r of records) {
    if (!r || typeof r !== "object" || "_init" in r || !r.proposedName) continue;
    const key = normalizeForGrouping(r.proposedName);
    const sub: SingleSubmission = {
      submitter: r.fullName || "Anonymous",
      department: r.department || "",
      rationale: r.rationale || "",
      unification: r.unification || "",
      realWorldTest: r.realWorldTest || "",
      culturalSignificance: r.culturalSignificance || "",
      tagline: r.tagline || "",
    };
    if (groups.has(key)) {
      groups.get(key)!.submissions.push(sub);
    } else {
      groups.set(key, { displayName: r.proposedName, submissions: [sub] });
    }
  }

  return Array.from(groups.values()).map((g, i) => ({
    id: i + 1,
    name: g.displayName,
    submissions: g.submissions,
  }));
}

async function saveVote(entry: Record<string, unknown>) {
  const getRes = await fetch(`https://api.jsonbin.io/v3/b/${VOTES_BIN}/latest`, {
    headers: { "X-Access-Key": JSONBIN_API_KEY },
  });
  if (!getRes.ok) throw new Error(`Read failed: ${getRes.status}`);
  const data = await getRes.json();
  const existing: unknown[] = Array.isArray(data.record) ? data.record : [];
  const cleaned = existing.filter(
    (r: any) => !(r && typeof r === "object" && "_init" in r)
  );
  cleaned.push({ ...entry, votedAt: new Date().toISOString() });

  const putRes = await fetch(`https://api.jsonbin.io/v3/b/${VOTES_BIN}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Key": JSONBIN_API_KEY,
    },
    body: JSON.stringify(cleaned),
  });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `Save failed: ${putRes.status}`);
  }
}

const RANK_COLORS: Record<number, { badge: string; card: string; shadow: string }> = {
  1: {
    badge: "linear-gradient(135deg, #6366f1, #4f46e5)",
    card: "linear-gradient(135deg, rgba(238,242,255,0.9), rgba(224,231,255,0.7))",
    shadow: "0 4px 20px rgba(99,102,241,0.12)",
  },
  2: {
    badge: "linear-gradient(135deg, #0ea5e9, #0891b2)",
    card: "linear-gradient(135deg, rgba(207,250,254,0.7), rgba(204,251,241,0.5))",
    shadow: "0 4px 20px rgba(14,165,233,0.1)",
  },
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: RANK_COLORS[rank]?.badge || "#e5e7eb",
        color: "white",
        fontSize: 13,
        fontWeight: 800,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {rank}
    </span>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null;
  const iconMap: Record<string, React.ReactNode> = {
    rationale: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    unification: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    realWorld: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    cultural: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        {iconMap[icon]}
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      </div>
      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, paddingLeft: 20 }}>{value}</p>
    </div>
  );
}

/* ── Thematic grouping ── */
interface ThemeGroup {
  theme: string;
  emoji: string;
  finalists: Finalist[];
}

const THEME_KEYWORDS: { theme: string; emoji: string; keywords: string[] }[] = [
  { theme: "Bridge & Connection", emoji: "🌉", keywords: ["bridge", "bridging", "connect", "connection", "link", "linking", "pathway", "path"] },
  { theme: "Voice & Communication", emoji: "🗣️", keywords: ["voice", "voices", "speak", "word", "words", "language", "lingual", "lingua", "echo", "dialog", "dialogue", "interpret", "translation"] },
  { theme: "Unity & Together", emoji: "🤝", keywords: ["unity", "unite", "united", "together", "one", "bond", "harmony", "harmonize", "merge", "fusion", "weave", "woven", "interweave"] },
  { theme: "Access & Care", emoji: "💙", keywords: ["access", "care", "advocate", "serve", "service", "health", "heal", "wellness", "patient", "heart", "embrace", "reach", "hand"] },
  { theme: "Culture & Diversity", emoji: "🌍", keywords: ["culture", "cultural", "diverse", "diversity", "world", "global", "mosaic", "tapestry", "spectrum", "kaleidoscope", "rainbow"] },
  { theme: "Light & Guidance", emoji: "✨", keywords: ["light", "beacon", "compass", "guide", "star", "north", "illuminate", "bright", "spark", "radiant", "lumina", "clarity"] },
];

function groupByTheme(finalists: Finalist[]): ThemeGroup[] {
  const assigned = new Set<number>();
  const groups: ThemeGroup[] = [];

  for (const tk of THEME_KEYWORDS) {
    const matched = finalists.filter(f => {
      if (assigned.has(f.id)) return false;
      const lower = f.name.toLowerCase();
      /* Also check rationale text for thematic match */
      const rationales = f.submissions.map(s => s.rationale.toLowerCase()).join(" ");
      return tk.keywords.some(kw => lower.includes(kw) || rationales.includes(kw));
    });
    if (matched.length > 0) {
      matched.forEach(f => assigned.add(f.id));
      groups.push({ theme: tk.theme, emoji: tk.emoji, finalists: matched });
    }
  }

  /* Anything unmatched goes into "Other Proposals" */
  const remaining = finalists.filter(f => !assigned.has(f.id));
  if (remaining.length > 0) {
    groups.push({ theme: "Other Proposals", emoji: "📝", finalists: remaining });
  }

  return groups;
}

export default function App() {
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [voterName, setVoterName] = useState("");
  const [ranked, setRanked] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [nameError, setNameError] = useState(false);
  const [rankError, setRankError] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchSubmissions()
      .then((subs) => { setFinalists(subs); setLoading(false); })
      .catch((err) => { setLoadError(err.message); setLoading(false); });
  }, []);

  const toggleRank = useCallback((id: number) => {
    setRanked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
    setRankError(false);
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getRank = (id: number) => {
    const idx = ranked.indexOf(id);
    return idx === -1 ? null : idx + 1;
  };

  const submit = async () => {
    let bad = false;
    if (!voterName.trim()) { setNameError(true); bad = true; }
    if (ranked.length < 2) { setRankError(true); bad = true; }
    if (bad) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      await saveVote({
        voterName,
        pick1: finalists.find((f) => f.id === ranked[0])?.name ?? "",
        pick2: finalists.find((f) => f.id === ranked[1])?.name ?? "",
        comment,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Vote submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

  const inputStyle = (error?: boolean): React.CSSProperties => ({
    width: "100%",
    borderRadius: 14,
    border: `1.5px solid ${error ? "#fca5a5" : "#c7d2fe"}`,
    background: error ? "#fef2f2" : "rgba(255,255,255,0.7)",
    padding: "12px 16px",
    fontSize: 14,
    color: "#1e293b",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box" as const,
  });

  /* ── loading ── */
  if (loading) {
    return (
      <div style={{ fontFamily: FONT, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(150deg, #e0e7ff 0%, #ccfbf1 50%, #fae8ff 100%)" }}>
        <div style={{ textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" stroke="#818cf8" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#6366f1", fontWeight: 600, fontSize: 16 }}>Loading submissions…</p>
        </div>
      </div>
    );
  }

  /* ── error ── */
  if (loadError) {
    return (
      <div style={{ fontFamily: FONT, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(150deg, #e0e7ff 0%, #ccfbf1 50%, #fae8ff 100%)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <p style={{ color: "#ef4444", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Unable to load submissions</p>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{loadError}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 100, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}>Try Again</button>
        </div>
      </div>
    );
  }

  /* ── no submissions ── */
  if (finalists.length === 0) {
    return (
      <div style={{ fontFamily: FONT, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(150deg, #e0e7ff 0%, #ccfbf1 50%, #fae8ff 100%)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <p style={{ color: "#6366f1", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No submissions yet</p>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>Voting will open once team members have submitted their name proposals.</p>
        </div>
      </div>
    );
  }

  /* ── success ── */
  if (submitted) {
    return (
      <div style={{ fontFamily: FONT, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "linear-gradient(150deg, #e0e7ff 0%, #ccfbf1 50%, #fae8ff 100%)" }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.8)", padding: 48, boxShadow: "0 8px 32px rgba(99,102,241,0.1)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #d1fae5, #ccfbf1)", border: "1px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Vote recorded.</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Thank you, <span style={{ color: "#1e293b", fontWeight: 600 }}>{voterName}</span>. Your picks will be sent to the Unity Committee for the final selection.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginBottom: 24 }}>
            <p style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>Your Top 2 Picks</p>
            {ranked.map((id, idx) => {
              const f = finalists.find((x) => x.id === id)!;
              const colors = RANK_COLORS[idx + 1];
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 14, padding: "12px 16px", background: colors?.card || "#f9fafb", border: "1px solid rgba(255,255,255,0.6)", boxShadow: colors?.shadow || "none" }}>
                  <RankBadge rank={idx + 1} />
                  <span style={{ color: "#1e293b", fontWeight: 600, fontSize: 14 }}>{f.name}</span>
                </div>
              );
            })}
          </div>
          <p style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>"Every voice matters in shaping who we become together."</p>
        </div>
      </div>
    );
  }

  /* ── main voting form ── */
  return (
    <div style={{ fontFamily: FONT, minHeight: "100vh", background: "linear-gradient(180deg, #e0e7ff 0%, #ede9fe 15%, #f5f3ff 30%, #f0fdfa 50%, #ecfdf5 65%, #fdf4ff 80%, #fae8ff 100%)" }}>
      {/* nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(224,231,255,0.75)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(199,210,254,0.5)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: 1.5, textTransform: "uppercase" }}>Advocate Health</span>
          <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 500 }}>Language Services</span>
        </div>
      </nav>

      {/* hero */}
      <header style={{ paddingTop: 64, paddingBottom: 40, textAlign: "center", paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #0ea5e9)", color: "white", padding: "6px 16px", borderRadius: 100, marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>
          Cast Your Vote
        </div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 52px)", fontWeight: 800, color: "#1e1b4b", letterSpacing: -1.5, marginBottom: 12, lineHeight: 1.1 }}>
          Choose our name.
        </h1>
        <p style={{ color: "#6b7280", fontSize: 16, maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
          {finalists.length} name{finalists.length !== 1 ? "s" : ""} submitted by your teammates. Review each proposal, then pick your top 2.
        </p>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", paddingBottom: 80 }}>
        {/* instructions */}
        <div style={{ background: "linear-gradient(135deg, rgba(238,242,255,0.8), rgba(207,250,254,0.4))", backdropFilter: "blur(16px)", borderRadius: 20, border: "1px solid rgba(165,180,252,0.3)", padding: 22, marginBottom: 32, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #c7d2fe, #a5b4fc)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#312e81", marginBottom: 2 }}>How to vote</p>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              Read each proposal — click "Show Details" to see the full rationale, how it unifies the team, and the real-world test. Then tap your top 2 names in order of preference. The top 2 go to the Unity Committee for the final decision.
            </p>
          </div>
        </div>

        {/* voter name */}
        <div style={{ background: "linear-gradient(135deg, rgba(238,242,255,0.8), rgba(224,231,255,0.5))", borderRadius: 20, border: "1px solid rgba(255,255,255,0.6)", padding: 28, marginBottom: 32, boxShadow: "0 1px 3px rgba(99,102,241,0.06)" }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
            Your Name
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#6366f1", marginLeft: 4, verticalAlign: "super", fontSize: 0 }} />
          </label>
          <input
            type="text"
            value={voterName}
            onChange={(e) => { setVoterName(e.target.value); setNameError(false); }}
            placeholder="Jane Doe"
            style={inputStyle(nameError)}
            onFocus={(e) => { e.target.style.borderColor = "#818cf8"; e.target.style.boxShadow = "0 0 0 3px rgba(129,140,248,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = nameError ? "#fca5a5" : "#c7d2fe"; e.target.style.boxShadow = "none"; }}
          />
          {nameError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4, fontWeight: 500 }}>This field is required.</p>}
        </div>

        {/* counter */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#312e81" }}>Submitted Names ({finalists.length})</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {[1, 2].map((n) => (
              <div key={n} style={{ width: 12, height: 12, borderRadius: "50%", background: ranked.length >= n ? RANK_COLORS[n]?.badge || "#d1d5db" : "#d1d5db", transition: "all 0.3s ease", boxShadow: ranked.length >= n ? "0 2px 6px rgba(99,102,241,0.25)" : "none" }} />
            ))}
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>{ranked.length}/2</span>
          </div>
        </div>
        {rankError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 12, padding: "0 4px", fontWeight: 500 }}>Please select your top 2 names.</p>}

        {/* finalist cards — grouped by theme */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
          {groupByTheme(finalists).map((group) => (
            <div key={group.theme}>
              {/* Theme section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 12px", padding: "0 4px" }}>
                <span style={{ fontSize: 18 }}>{group.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5", letterSpacing: 0.5, textTransform: "uppercase" }}>{group.theme}</span>
                <span style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 500 }}>({group.finalists.length})</span>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(165,180,252,0.3), transparent)", marginLeft: 4 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {group.finalists.map((f) => {
            const rank = getRank(f.id);
            const selected = rank !== null;
            const disabled = !selected && ranked.length >= 2;
            const colors = selected ? RANK_COLORS[rank!] : null;
            const isExpanded = expanded[f.id] || false;
            const subs = f.submissions;
            const hasDetails = subs.some(s => s.rationale || s.unification || s.realWorldTest || s.culturalSignificance);
            const allSubmitters = subs.map(s => s.submitter).filter(Boolean);
            const firstTagline = subs.find(s => s.tagline)?.tagline;

            return (
              <div key={f.id} style={{ borderRadius: 20, border: selected ? "1.5px solid rgba(255,255,255,0.7)" : "1px solid rgba(255,255,255,0.6)", background: selected ? colors?.card || "#f9fafb" : disabled ? "rgba(241,245,249,0.4)" : "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)", overflow: "hidden", boxShadow: selected ? colors?.shadow || "none" : "0 1px 3px rgba(99,102,241,0.04)", transition: "all 0.2s ease", opacity: disabled ? 0.35 : 1 }}>
                {/* clickable header to vote */}
                <button
                  onClick={() => toggleRank(f.id)}
                  disabled={disabled}
                  style={{ width: "100%", textAlign: "left", padding: "20px 22px", display: "flex", alignItems: "flex-start", gap: 16, cursor: disabled ? "not-allowed" : "pointer", background: "transparent", border: "none", outline: "none" }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {selected ? (
                      <RankBadge rank={rank!} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #c7d2fe", transition: "border-color 0.2s" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 18, color: selected ? "#1e293b" : "#475569" }}>
                      {f.name}
                      {subs.length > 1 && (
                        <span style={{ fontSize: 11, fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "white", borderRadius: 100, padding: "2px 8px", marginLeft: 8, verticalAlign: "middle" }}>
                          {subs.length} submissions
                        </span>
                      )}
                    </p>
                    {firstTagline && (
                      <p style={{ fontSize: 13, color: "#818cf8", fontStyle: "italic", marginTop: 2 }}>"{firstTagline}"</p>
                    )}
                    <p style={{ color: "#a5b4fc", fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                      Submitted by {allSubmitters.join(", ")}
                    </p>
                  </div>
                </button>

                {/* expand/collapse details */}
                {hasDetails && (
                  <>
                    <div style={{ padding: "0 22px 4px", borderTop: "1px solid rgba(165,180,252,0.15)" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(f.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6366f1", padding: "10px 0", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        {isExpanded ? "Hide Details" : `Show Details${subs.length > 1 ? ` (${subs.length} perspectives)` : ""}`}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: "0 22px 20px", borderTop: "1px solid rgba(165,180,252,0.1)" }}>
                        {subs.map((sub, si) => (
                          <div key={si} style={{ marginBottom: subs.length > 1 && si < subs.length - 1 ? 20 : 0 }}>
                            {subs.length > 1 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#4f46e5" }}>{si + 1}</div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{sub.submitter}</span>
                                {sub.department && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {sub.department}</span>}
                              </div>
                            )}
                            <DetailRow icon="rationale" label="Meaning & Rationale" value={sub.rationale} />
                            <DetailRow icon="unification" label="How It Unifies" value={sub.unification} />
                            <DetailRow icon="realWorld" label="Real-World Test" value={sub.realWorldTest} />
                            <DetailRow icon="cultural" label="Cultural Significance" value={sub.culturalSignificance} />
                            {subs.length > 1 && si < subs.length - 1 && (
                              <div style={{ borderBottom: "1px dashed rgba(165,180,252,0.25)", marginTop: 14 }} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
              </div>
            </div>
          ))}
        </div>

        {/* optional comment */}
        <div style={{ background: "linear-gradient(135deg, rgba(250,232,255,0.5), rgba(237,233,254,0.5))", borderRadius: 20, border: "1px solid rgba(255,255,255,0.6)", padding: 28, marginBottom: 40, boxShadow: "0 1px 3px rgba(124,58,237,0.04)" }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>
            Why did you choose your top pick?
          </label>
          <p style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 10, fontWeight: 500 }}>Optional — but we'd love to hear your reasoning.</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share your thoughts…"
            style={{ width: "100%", borderRadius: 14, border: "1.5px solid #d8b4fe", background: "rgba(255,255,255,0.7)", padding: "12px 16px", fontSize: 14, color: "#1e293b", outline: "none", resize: "none" as const, lineHeight: 1.6, transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" as const }}
            onFocus={(e) => { e.target.style.borderColor = "#a78bfa"; e.target.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.12)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#d8b4fe"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* submit */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={submit}
            disabled={ranked.length < 2 || submitting}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, padding: "0 36px", borderRadius: 100,
              background: ranked.length < 2 ? "#d1d5db" : submitting ? "linear-gradient(135deg, #a5b4fc, #818cf8)" : "linear-gradient(135deg, #6366f1, #4f46e5, #7c3aed)",
              color: "white", fontSize: 15, fontWeight: 700, letterSpacing: 0.5, border: "none",
              cursor: ranked.length < 2 || submitting ? "not-allowed" : "pointer",
              boxShadow: ranked.length >= 2 ? "0 4px 20px rgba(99,102,241,0.35), 0 2px 8px rgba(124,58,237,0.2)" : "none",
              transition: "transform 0.15s, box-shadow 0.15s", opacity: submitting ? 0.8 : 1,
            }}
            onMouseDown={(e) => { if (ranked.length >= 2 && !submitting) (e.target as HTMLElement).style.transform = "scale(0.97)"; }}
            onMouseUp={(e) => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
          >
            {submitting ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8, animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Submitting…
              </>
            ) : (
              "Submit My Vote"
            )}
          </button>
          {submitError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12, fontWeight: 500 }}>{submitError}</p>}
          <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
            Voting closes on <span style={{ color: "#475569", fontWeight: 600 }}>Friday, March 20</span>. The Unity Committee will select the winner.
          </p>
        </div>
      </main>

      {/* footer */}
      <footer style={{ borderTop: "1px solid rgba(165,180,252,0.3)", padding: "32px 24px", background: "linear-gradient(135deg, rgba(224,231,255,0.4), rgba(237,233,254,0.3))" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#a5b4fc", fontSize: 12, lineHeight: 1.6, marginBottom: 4, fontStyle: "italic" }}>
            At the desired time. In the optimal place. Through appropriate modalities. At no cost.
          </p>
          <p style={{ color: "#c7d2fe", fontSize: 11 }}>
            Advocate Health · Language Services · One Team, One Voice, One Mission
          </p>
        </div>
      </footer>
    </div>
  );
}
