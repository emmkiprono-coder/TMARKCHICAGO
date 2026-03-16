import { useState, useEffect, useCallback, useRef } from "react";

const PAGES = [
  { id: "home", name: "Home / Hero", icon: "⚓", hash: "#" },
  { id: "about", name: "About", icon: "📖", hash: "#about" },
  { id: "services", name: "Services", icon: "🛥️", hash: "#services" },
  { id: "fleet", name: "Fleet", icon: "⛵", hash: "#fleet" },
  { id: "experiences", name: "Experiences", icon: "🌊", hash: "#experiences" },
  { id: "passport", name: "Passport", icon: "🎫", hash: "#passport" },
  { id: "gallery", name: "Gallery", icon: "📸", hash: "#gallery" },
  { id: "testimonials", name: "Testimonials", icon: "⭐", hash: "#testimonials" },
  { id: "pricing", name: "Pricing", icon: "💰", hash: "#pricing" },
  { id: "faq", name: "FAQ", icon: "❓", hash: "#faq" },
  { id: "crew", name: "Crew", icon: "👥", hash: "#crew" },
  { id: "contact", name: "Contact", icon: "📍", hash: "#contact" },
  { id: "global", name: "Global / Nav", icon: "🌐", hash: "#" },
];

const CATEGORIES = [
  { id: "design", label: "Design", color: "#c8913a" },
  { id: "content", label: "Content", color: "#2d5a7b" },
  { id: "ux", label: "UX", color: "#7c5cbf" },
  { id: "technical", label: "Technical", color: "#2e7d5b" },
  { id: "mobile", label: "Mobile", color: "#c0392b" },
];

const PRIORITIES = [
  { id: "critical", label: "Critical", color: "#c0392b", bg: "#fdeaea" },
  { id: "high", label: "High", color: "#d4740e", bg: "#fef3e2" },
  { id: "medium", label: "Medium", color: "#b8960c", bg: "#fef9e7" },
  { id: "low", label: "Low", color: "#2e7d5b", bg: "#e8f5ef" },
  { id: "enhancement", label: "Enhancement", color: "#2d5a7b", bg: "#e8f0f6" },
];

const STATUSES = [
  { id: "new", label: "New", color: "#8e99a4" },
  { id: "in_review", label: "In Review", color: "#c8913a" },
  { id: "accepted", label: "Accepted", color: "#2e7d5b" },
  { id: "rejected", label: "Rejected", color: "#c0392b" },
  { id: "implemented", label: "Done", color: "#2d5a7b" },
];

const SITE_URL = "https://tmark-website-kips-projects-37868dc5.vercel.app/";
const gold = "linear-gradient(135deg, #c8913a 0%, #daa856 50%, #c8913a 100%)";

export default function TMarkReviewHub() {
  const [reviewer, setReviewer] = useState(null);
  const [reviewerInput, setReviewerInput] = useState("");
  const [reviewerRole, setReviewerRole] = useState("reviewer");
  const [activePage, setActivePage] = useState("home");
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [formData, setFormData] = useState({ text: "", category: "design", priority: "medium", rating: 3 });
  const [selectedPin, setSelectedPin] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelView, setPanelView] = useState("page"); // page, all, dashboard
  const [filterStatus, setFilterStatus] = useState("all");
  const [replyText, setReplyText] = useState("");
  const [showPageNav, setShowPageNav] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [device, setDevice] = useState("desktop");
  const overlayRef = useRef(null);
  const pollRef = useRef(null);

  const loadFeedback = useCallback(async () => {
    try {
      const r = await window.storage.get("tmark-pins-v1", true);
      if (r?.value) setFeedbackItems(JSON.parse(r.value));
    } catch {}
  }, []);

  const saveFeedback = useCallback(async (items) => {
    try { await window.storage.set("tmark-pins-v1", JSON.stringify(items), true); } catch {}
  }, []);

  useEffect(() => {
    loadFeedback();
    pollRef.current = setInterval(loadFeedback, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadFeedback]);

  const pageUrl = SITE_URL + (PAGES.find(p => p.id === activePage)?.hash || "");
  const pageItems = feedbackItems.filter(i => i.page === activePage);
  const filteredItems = (panelView === "all" ? feedbackItems : pageItems).filter(i => filterStatus === "all" || i.status === filterStatus);

  const handleOverlayClick = (e) => {
    if (!annotateMode) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x: xPct, y: yPct });
    setSelectedPin(null);
    setFormData({ text: "", category: "design", priority: "medium", rating: 3 });
  };

  const submitPin = async () => {
    if (!pendingPin || !formData.text.trim()) return;
    const item = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      page: activePage, reviewer, role: reviewerRole,
      x: pendingPin.x, y: pendingPin.y,
      text: formData.text.trim(), category: formData.category,
      priority: formData.priority, rating: formData.rating,
      status: "new", timestamp: new Date().toISOString(),
      replies: [],
      statusHistory: [{ status: "new", by: "system", at: new Date().toISOString() }],
    };
    const updated = [item, ...feedbackItems];
    setFeedbackItems(updated);
    await saveFeedback(updated);
    setPendingPin(null);
    setFormData({ text: "", category: "design", priority: "medium", rating: 3 });
    setPanelOpen(true);
  };

  const updateStatus = async (id, status) => {
    const updated = feedbackItems.map(i => i.id === id ? { ...i, status, statusHistory: [...(i.statusHistory || []), { status, by: reviewer, at: new Date().toISOString() }] } : i);
    setFeedbackItems(updated);
    await saveFeedback(updated);
  };

  const addReply = async (id) => {
    if (!replyText.trim()) return;
    const updated = feedbackItems.map(i => i.id === id ? { ...i, replies: [...(i.replies || []), { reviewer, text: replyText.trim(), at: new Date().toISOString() }] } : i);
    setFeedbackItems(updated);
    await saveFeedback(updated);
    setReplyText("");
  };

  const deletePin = async (id) => {
    const updated = feedbackItems.filter(i => i.id !== id);
    setFeedbackItems(updated);
    await saveFeedback(updated);
    setSelectedPin(null);
  };

  const resetAll = async () => {
    if (confirm("Delete all feedback permanently?")) {
      setFeedbackItems([]);
      try { await window.storage.delete("tmark-pins-v1", true); } catch {}
    }
  };

  const fmt = (iso) => {
    const d = new Date(iso), s = (new Date() - d) / 1000;
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const pinNumber = (id) => {
    const sorted = [...pageItems].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return sorted.findIndex(i => i.id === id) + 1;
  };

  // --- LOGIN ---
  if (!reviewer) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(170deg, #f8f5f0 0%, #faf8f4 40%, #f0ece4 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap');
          @keyframes slideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        `}</style>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, opacity: 0.5 }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: "100%", height: 100 }}>
            <path d="M0,60 C150,90 350,30 600,60 C850,90 1050,30 1200,60 L1200,120 L0,120 Z" fill="rgba(200,145,58,0.1)" />
          </svg>
        </div>
        <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(200,145,58,0.25)", borderRadius: 16, padding: "52px 44px", maxWidth: 460, width: "90%", animation: "slideUp 0.7s ease-out", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.06)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: gold, borderRadius: "16px 16px 0 0" }} />
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 13, letterSpacing: 5, color: "#c8913a", marginBottom: 6, textTransform: "uppercase", fontFamily: "'Source Sans 3'", fontWeight: 600 }}>TMarK Charters</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#1a2a3a", fontFamily: "'Playfair Display', serif" }}>Website Review Hub</div>
            <div style={{ fontSize: 14, color: "#8e99a4", marginTop: 8, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>Click anywhere. Drop a pin. Leave feedback.</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, letterSpacing: 3, color: "#8e99a4", textTransform: "uppercase", display: "block", marginBottom: 8, fontFamily: "'Source Sans 3'", fontWeight: 600 }}>Your Name</label>
            <input value={reviewerInput} onChange={e => setReviewerInput(e.target.value)} onKeyDown={e => e.key === "Enter" && reviewerInput.trim() && setReviewer(reviewerInput.trim())}
              placeholder="Enter your name..." style={{ width: "100%", padding: "14px 18px", background: "#faf8f4", border: "1px solid rgba(200,145,58,0.25)", borderRadius: 10, color: "#1a2a3a", fontSize: 16, outline: "none", fontFamily: "'Source Sans 3'", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, letterSpacing: 3, color: "#8e99a4", textTransform: "uppercase", display: "block", marginBottom: 8, fontFamily: "'Source Sans 3'", fontWeight: 600 }}>Role</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "reviewer", label: "Reviewer" }, { id: "admin", label: "Admin" }, { id: "developer", label: "Developer" }].map(r => (
                <button key={r.id} onClick={() => setReviewerRole(r.id)} style={{ flex: 1, padding: "11px", background: reviewerRole === r.id ? "rgba(200,145,58,0.1)" : "#faf8f4", border: `1.5px solid ${reviewerRole === r.id ? "#c8913a" : "rgba(200,145,58,0.2)"}`, borderRadius: 10, color: reviewerRole === r.id ? "#c8913a" : "#8e99a4", cursor: "pointer", fontSize: 13, fontWeight: reviewerRole === r.id ? 600 : 400, fontFamily: "'Source Sans 3'" }}>{r.label}</button>
              ))}
            </div>
          </div>
          <button onClick={() => reviewerInput.trim() && setReviewer(reviewerInput.trim())} disabled={!reviewerInput.trim()} style={{ width: "100%", padding: "15px", background: reviewerInput.trim() ? gold : "#e8e4dc", border: "none", borderRadius: 10, color: reviewerInput.trim() ? "#fff" : "#b0a89c", cursor: reviewerInput.trim() ? "pointer" : "not-allowed", fontSize: 14, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Source Sans 3'", fontWeight: 600, boxShadow: reviewerInput.trim() ? "0 4px 16px rgba(200,145,58,0.3)" : "none" }}>
            Enter Review Hub →
          </button>
        </div>
      </div>
    );
  }

  const sel = { padding: "5px 8px", background: "#fff", border: "1px solid #ddd5c8", borderRadius: 6, color: "#3a3a3a", fontSize: 11, fontFamily: "'Source Sans 3'", cursor: "pointer" };
  const totalByStatus = STATUSES.map(s => ({ ...s, count: feedbackItems.filter(i => i.status === s.id).length }));
  const totalByPriority = PRIORITIES.map(p => ({ ...p, count: feedbackItems.filter(i => i.priority === p.id).length }));

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Source Sans 3', sans-serif", color: "#1a2a3a", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }
        @keyframes pingRing { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(2.5); opacity:0; } }
        input, textarea, select { font-family: 'Source Sans 3', sans-serif; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(200,145,58,0.3); border-radius: 3px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", background: "rgba(255,255,255,0.95)", borderBottom: "1px solid rgba(200,145,58,0.15)", flexShrink: 0, zIndex: 200, backdropFilter: "blur(12px)" }}>
        <span style={{ fontSize: 14, letterSpacing: 3, color: "#c8913a", fontWeight: 700, fontFamily: "'Playfair Display'" }}>TMarK</span>
        <span style={{ fontSize: 10, color: "#8e99a4", letterSpacing: 2, textTransform: "uppercase" }}>Review</span>
        <div style={{ height: 18, width: 1, background: "#e8e4dc" }} />

        {/* Page selector */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowPageNav(!showPageNav)} style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(200,145,58,0.08)", border: "1px solid rgba(200,145,58,0.2)", color: "#c8913a", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            {PAGES.find(p => p.id === activePage)?.icon} {PAGES.find(p => p.id === activePage)?.name} ▾
          </button>
          {showPageNav && (
            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid rgba(200,145,58,0.2)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 300, width: 220, maxHeight: 400, overflowY: "auto", padding: 6 }}>
              {PAGES.map(p => {
                const cnt = feedbackItems.filter(i => i.page === p.id).length;
                return (
                  <button key={p.id} onClick={() => { setActivePage(p.id); setShowPageNav(false); setSelectedPin(null); setPendingPin(null); setIframeKey(k => k + 1); }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 6, border: "none",
                    background: activePage === p.id ? "rgba(200,145,58,0.1)" : "transparent",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 16 }}>{p.icon}</span>
                    <span style={{ flex: 1, fontSize: 12, color: activePage === p.id ? "#c8913a" : "#3a3a3a", fontWeight: activePage === p.id ? 600 : 400 }}>{p.name}</span>
                    {cnt > 0 && <span style={{ fontSize: 10, color: "#c8913a", background: "rgba(200,145,58,0.1)", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>{cnt}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: 18, width: 1, background: "#e8e4dc" }} />

        {/* Annotate toggle */}
        <button onClick={() => { setAnnotateMode(!annotateMode); setPendingPin(null); }} style={{
          padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
          background: annotateMode ? gold : "rgba(200,145,58,0.08)",
          border: annotateMode ? "none" : "1px solid rgba(200,145,58,0.2)",
          color: annotateMode ? "#fff" : "#c8913a",
          boxShadow: annotateMode ? "0 2px 8px rgba(200,145,58,0.3)" : "none",
        }}>
          📌 {annotateMode ? "Click site to pin" : "Annotate"}
        </button>

        {/* Device switcher */}
        {["desktop", "tablet", "mobile"].map(d => (
          <button key={d} onClick={() => setDevice(d)} style={{
            padding: "3px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer",
            background: device === d ? "rgba(200,145,58,0.1)" : "transparent",
            border: device === d ? "1px solid rgba(200,145,58,0.2)" : "1px solid transparent",
            color: device === d ? "#c8913a" : "#8e99a4",
          }}>{d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"}</button>
        ))}

        <button onClick={() => setIframeKey(k => k + 1)} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 12, cursor: "pointer", background: "transparent", border: "none", color: "#8e99a4" }} title="Refresh">↻</button>

        <div style={{ flex: 1 }} />

        {/* Panel toggle */}
        <button onClick={() => setPanelOpen(!panelOpen)} style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(200,145,58,0.08)", border: "1px solid rgba(200,145,58,0.2)", color: "#c8913a", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          {panelOpen ? "Hide Panel ◂" : "Show Panel ▸"} ({feedbackItems.length})
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2e7d5b" }} />
          <span style={{ fontSize: 11, color: "#3a3a3a", fontWeight: 500 }}>{reviewer}</span>
        </div>
        <button onClick={() => setReviewer(null)} style={{ padding: "3px 8px", background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.12)", borderRadius: 4, color: "#c0392b", cursor: "pointer", fontSize: 10 }}>Exit</button>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* WEBSITE + OVERLAY */}
        <div style={{ flex: 1, position: "relative", display: "flex", justifyContent: "center", background: device !== "desktop" ? "#e8e4dc" : "transparent" }}>
          <div style={{ position: "relative", width: device === "desktop" ? "100%" : device === "tablet" ? 768 : 375, height: "100%", flexShrink: 0 }}>
            <iframe
              key={`${iframeKey}-${activePage}`}
              src={pageUrl}
              style={{
                width: "100%", height: "100%", border: "none",
                ...(device !== "desktop" ? { border: "6px solid #1a2a3a", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" } : {}),
              }}
              title="TMarK Website"
            />

            {/* CLICK OVERLAY */}
            <div
              ref={overlayRef}
              onClick={handleOverlayClick}
              style={{
                position: "absolute", inset: 0, zIndex: 10,
                cursor: annotateMode ? "crosshair" : "default",
                pointerEvents: annotateMode ? "auto" : "none",
                background: annotateMode ? "rgba(200,145,58,0.03)" : "transparent",
                ...(device !== "desktop" ? { borderRadius: 16, border: "6px solid transparent" } : {}),
              }}
            >
              {/* Existing pins for this page */}
              {pageItems.map(item => {
                const num = pinNumber(item.id);
                const pri = PRIORITIES.find(p => p.id === item.priority);
                const isSelected = selectedPin === item.id;
                return (
                  <div key={item.id} style={{ position: "absolute", left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -100%)", zIndex: isSelected ? 50 : 20, pointerEvents: "auto" }}>
                    {/* Ping ring */}
                    {item.status === "new" && (
                      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: pri.color, animation: "pingRing 2s infinite", opacity: 0.4 }} />
                    )}
                    {/* Pin */}
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPin(isSelected ? null : item.id); setPendingPin(null); }} style={{
                      width: 28, height: 28, borderRadius: "50%", border: `2px solid #fff`,
                      background: pri.color, color: "#fff", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isSelected ? `0 0 0 3px ${pri.color}44, 0 4px 12px rgba(0,0,0,0.2)` : "0 2px 8px rgba(0,0,0,0.2)",
                      transform: isSelected ? "scale(1.2)" : "scale(1)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      position: "relative", zIndex: 2,
                    }}>{num}</button>

                    {/* Selected pin popup */}
                    {isSelected && (
                      <div onClick={e => e.stopPropagation()} style={{
                        position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                        width: 320, background: "#fff", borderRadius: 12, padding: 16,
                        border: "1px solid rgba(200,145,58,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                        animation: "fadeIn 0.2s ease-out", zIndex: 100,
                      }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: pri.bg, color: pri.color, fontWeight: 600 }}>{pri.label}</span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: `${CATEGORIES.find(c => c.id === item.category)?.color}10`, color: CATEGORIES.find(c => c.id === item.category)?.color }}>{CATEGORIES.find(c => c.id === item.category)?.label}</span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: `${STATUSES.find(s => s.id === item.status)?.color}10`, color: STATUSES.find(s => s.id === item.status)?.color }}>{STATUSES.find(s => s.id === item.status)?.label}</span>
                          <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>{[...Array(5)].map((_, i) => <span key={i} style={{ fontSize: 10, color: i < item.rating ? "#c8913a" : "#ddd" }}>★</span>)}</div>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#2a3a4a", lineHeight: 1.5 }}>{item.text}</p>
                        <div style={{ fontSize: 11, color: "#8e99a4", marginBottom: 10 }}>{item.reviewer} · {fmt(item.timestamp)}</div>

                        {/* Status buttons */}
                        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                          {STATUSES.map(s => (
                            <button key={s.id} onClick={() => updateStatus(item.id, s.id)} style={{
                              padding: "3px 8px", borderRadius: 4, fontSize: 10,
                              background: item.status === s.id ? `${s.color}15` : "#faf8f4",
                              border: `1px solid ${item.status === s.id ? s.color : "#e8e4dc"}`,
                              color: item.status === s.id ? s.color : "#8e99a4",
                              cursor: "pointer", fontWeight: item.status === s.id ? 600 : 400,
                            }}>{s.label}</button>
                          ))}
                        </div>

                        {/* Replies */}
                        {item.replies?.map((r, ri) => (
                          <div key={ri} style={{ padding: "6px 10px", marginBottom: 4, background: "#faf8f4", borderRadius: 6, borderLeft: "2px solid #c8913a" }}>
                            <div style={{ fontSize: 12, color: "#2a3a4a" }}>{r.text}</div>
                            <div style={{ fontSize: 10, color: "#8e99a4" }}>{r.reviewer} · {fmt(r.at)}</div>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && addReply(item.id)}
                            placeholder="Reply..." style={{ flex: 1, padding: "6px 10px", background: "#faf8f4", border: "1px solid #ddd5c8", borderRadius: 6, fontSize: 12, outline: "none", color: "#1a2a3a" }} />
                          <button onClick={() => addReply(item.id)} style={{ padding: "6px 12px", background: gold, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>↩</button>
                        </div>
                        {reviewerRole === "admin" && (
                          <button onClick={() => deletePin(item.id)} style={{ marginTop: 8, padding: "3px 8px", background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.12)", borderRadius: 4, color: "#c0392b", cursor: "pointer", fontSize: 10, width: "100%" }}>Delete pin</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pending new pin */}
              {pendingPin && (
                <div style={{ position: "absolute", left: `${pendingPin.x}%`, top: `${pendingPin.y}%`, transform: "translate(-50%, -100%)", zIndex: 60, pointerEvents: "auto" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #fff", background: "#c8913a", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(200,145,58,0.4)", animation: "pulse 1s infinite" }}>+</div>
                  <div onClick={e => e.stopPropagation()} style={{
                    position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                    width: 300, background: "#fff", borderRadius: 12, padding: 16,
                    border: "1px solid rgba(200,145,58,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    animation: "fadeIn 0.2s ease-out",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#c8913a", marginBottom: 10 }}>New Feedback Pin</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ ...sel }}>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                      <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={{ ...sel }}>
                        {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setFormData({ ...formData, rating: n })} style={{
                          width: 28, height: 28, borderRadius: 5, fontSize: 14, cursor: "pointer",
                          background: formData.rating >= n ? "rgba(200,145,58,0.12)" : "#faf8f4",
                          border: `1px solid ${formData.rating >= n ? "#c8913a" : "#ddd5c8"}`,
                          color: formData.rating >= n ? "#c8913a" : "#ccc",
                        }}>★</button>
                      ))}
                    </div>
                    <textarea value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })}
                      placeholder="What's the issue or suggestion?" rows={3} autoFocus
                      style={{ width: "100%", padding: "10px 12px", background: "#faf8f4", border: "1px solid #ddd5c8", borderRadius: 8, fontSize: 13, outline: "none", resize: "none", color: "#1a2a3a", boxSizing: "border-box", lineHeight: 1.5 }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => setPendingPin(null)} style={{ flex: 1, padding: "8px", background: "#faf8f4", border: "1px solid #ddd5c8", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#8e99a4" }}>Cancel</button>
                      <button onClick={submitPin} disabled={!formData.text.trim()} style={{ flex: 1, padding: "8px", background: formData.text.trim() ? gold : "#e8e4dc", border: "none", borderRadius: 8, cursor: formData.text.trim() ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, color: formData.text.trim() ? "#fff" : "#b0a89c" }}>Drop Pin</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Annotate mode indicator */}
            {annotateMode && (
              <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "rgba(200,145,58,0.95)", color: "#fff", padding: "8px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(200,145,58,0.3)", pointerEvents: "none" }}>
                📌 Click anywhere on the site to drop a feedback pin
              </div>
            )}
          </div>
        </div>

        {/* SIDE PANEL */}
        {panelOpen && (
          <div style={{ width: 340, borderLeft: "1px solid rgba(200,145,58,0.15)", background: "linear-gradient(170deg, #f8f5f0, #faf8f4)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, animation: "fadeIn 0.2s ease-out" }}>
            {/* Panel tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(200,145,58,0.12)", padding: "8px 12px", gap: 4, flexShrink: 0 }}>
              {[{ id: "page", label: `This Page (${pageItems.length})` }, { id: "all", label: `All (${feedbackItems.length})` }, { id: "dashboard", label: "Stats" }].map(t => (
                <button key={t.id} onClick={() => setPanelView(t.id)} style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600,
                  background: panelView === t.id ? "rgba(200,145,58,0.1)" : "transparent",
                  border: panelView === t.id ? "1px solid rgba(200,145,58,0.25)" : "1px solid transparent",
                  color: panelView === t.id ? "#c8913a" : "#8e99a4",
                }}>{t.label}</button>
              ))}
            </div>

            {panelView !== "dashboard" && (
              <div style={{ display: "flex", gap: 6, padding: "8px 12px", flexShrink: 0 }}>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}><option value="all">All</option>{STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {panelView === "dashboard" ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[{ l: "Total", v: feedbackItems.length, c: "#c8913a" }, { l: "Reviewers", v: [...new Set(feedbackItems.map(i => i.reviewer))].length, c: "#7c5cbf" }].map((s, i) => (
                      <div key={i} style={{ background: "#fff", border: "1px solid rgba(200,145,58,0.1)", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: s.c, fontFamily: "'Playfair Display'" }}>{s.v}</div>
                        <div style={{ fontSize: 9, letterSpacing: 2, color: "#8e99a4", textTransform: "uppercase", fontWeight: 600 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid rgba(200,145,58,0.1)" }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: "#8e99a4", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>By Status</div>
                    {totalByStatus.map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                        <span style={{ flex: 1, fontSize: 12 }}>{s.label}</span>
                        <div style={{ width: 60, height: 5, background: "#f0ece4", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${feedbackItems.length ? (s.count / feedbackItems.length) * 100 : 0}%`, background: s.color, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: s.color, fontWeight: 600, width: 20, textAlign: "right" }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid rgba(200,145,58,0.1)" }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: "#8e99a4", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>By Priority</div>
                    {totalByPriority.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                        <span style={{ flex: 1, fontSize: 12 }}>{p.label}</span>
                        <span style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>{p.count}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#fff", borderRadius: 10, padding: 14, border: "1px solid rgba(200,145,58,0.1)" }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: "#8e99a4", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Pages</div>
                    {PAGES.map(p => {
                      const cnt = feedbackItems.filter(i => i.page === p.id).length;
                      return cnt > 0 ? (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, cursor: "pointer" }} onClick={() => { setActivePage(p.id); setPanelView("page"); setIframeKey(k => k + 1); }}>
                          <span style={{ fontSize: 14 }}>{p.icon}</span>
                          <span style={{ flex: 1, fontSize: 12 }}>{p.name}</span>
                          <span style={{ fontSize: 12, color: "#c8913a", fontWeight: 600 }}>{cnt}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  {reviewerRole === "admin" && <button onClick={resetAll} style={{ marginTop: 12, padding: "6px 12px", background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.12)", borderRadius: 6, color: "#c0392b", cursor: "pointer", fontSize: 10, width: "100%" }}>Reset All</button>}
                </div>
              ) : filteredItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📌</div>
                  <div style={{ fontSize: 13, color: "#8e99a4", fontStyle: "italic" }}>No pins yet</div>
                  <div style={{ fontSize: 12, color: "#b0a89c", marginTop: 4 }}>Click "Annotate" then click on the site</div>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const pri = PRIORITIES.find(p => p.id === item.priority);
                  const cat = CATEGORIES.find(c => c.id === item.category);
                  const sta = STATUSES.find(s => s.id === item.status);
                  const page = PAGES.find(p => p.id === item.page);
                  const num = pinNumber(item.id);
                  return (
                    <div key={item.id} onClick={() => { setSelectedPin(selectedPin === item.id ? null : item.id); if (panelView === "all" && item.page !== activePage) { setActivePage(item.page); setIframeKey(k => k + 1); } }}
                      style={{
                        background: selectedPin === item.id ? "rgba(200,145,58,0.06)" : "#fff",
                        border: `1.5px solid ${selectedPin === item.id ? "rgba(200,145,58,0.3)" : "rgba(200,145,58,0.08)"}`,
                        borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                        animation: `fadeIn 0.2s ease-out ${idx * 0.03}s both`,
                      }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: pri.color, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num || "·"}</div>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: pri.bg, color: pri.color, fontWeight: 600 }}>{pri.label}</span>
                        <span style={{ fontSize: 10, color: cat.color }}>{cat.label}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: `${sta.color}10`, color: sta.color }}>{sta.label}</span>
                        {panelView === "all" && <span style={{ fontSize: 10, color: "#8e99a4", marginLeft: "auto" }}>{page?.icon}</span>}
                      </div>
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#2a3a4a", lineHeight: 1.5 }}>{item.text}</p>
                      <div style={{ fontSize: 10, color: "#8e99a4" }}>{item.reviewer} · {fmt(item.timestamp)} {item.replies?.length > 0 && `· 💬${item.replies.length}`}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}