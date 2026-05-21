import { useState } from "react";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#F4EFE6",
  surface: "#FDFAF5",
  border: "#E2D9C8",
  olive: "#2D4A3E",
  oliveLight: "#3D6B5A",
  accent: "#4A7C6F",
  gold: "#C9A84C",
  goldLight: "#E8D5A3",
  red: "#C0392B",
  redLight: "#FADBD8",
  text: "#1A1A1A",
  textMid: "#4A4A4A",
  textMuted: "#8A8A8A",
  pill: "#E8E0D0",
  pillActive: "#2D4A3E",
  tagGreen: "#E8F5F0",
  tagGreenText: "#2D6A4F",
  tagOrange: "#FEF3E2",
  tagOrangeText: "#B7600A",
  white: "#FFFFFF",
};

// ── Shared Components ─────────────────────────────────────────────────────────

const NavBar = () => (
  <div style={{
    background: C.surface,
    borderBottom: `1px solid ${C.border}`,
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 18 }}>☰</span>
      <span style={{ fontWeight: 700, fontSize: 16, color: C.olive, fontFamily: "'Syne', sans-serif" }}>
        Campus Vault
      </span>
    </div>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: C.bg, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 16, border: `1px solid ${C.border}`,
    }}>🔔</div>
  </div>
);

const BottomNav = ({ active, setActive }) => {
  const tabs = [
    { id: "home", icon: "⌂", label: "HOME" },
    { id: "class", icon: "◫", label: "CLASS" },
    { id: "social", icon: "◎", label: "SOCIAL" },
    { id: "market", icon: "⊞", label: "MARKET" },
    { id: "profile", icon: "◉", label: "PROFILE" },
  ];
  return (
    <div style={{
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      display: "flex",
      position: "sticky",
      bottom: 0,
      zIndex: 100,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          flex: 1, background: "none", border: "none",
          padding: "10px 0 8px",
          color: active === t.id ? C.olive : C.textMuted,
          cursor: "pointer", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 2,
          borderTop: active === t.id ? `2px solid ${C.olive}` : "2px solid transparent",
          transition: "all 0.15s",
        }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", fontFamily: "'Syne', sans-serif" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

const YearPills = ({ active, setActive }) => {
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
      {years.map(y => (
        <button key={y} onClick={() => setActive(y)} style={{
          background: active === y ? C.pillActive : C.pill,
          color: active === y ? C.white : C.textMid,
          border: "none", borderRadius: 20,
          padding: "6px 14px", fontSize: 12,
          fontWeight: active === y ? 700 : 400,
          fontFamily: "'Syne', sans-serif",
          cursor: "pointer", whiteSpace: "nowrap",
          transition: "all 0.2s",
        }}>{y}</button>
      ))}
    </div>
  );
};

// ── Anonymous Doubt Section ───────────────────────────────────────────────────
const AnonymousDoubt = () => {
  const [text, setText] = useState("");
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 18, marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>🌊</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.olive, fontFamily: "'Syne', sans-serif" }}>
          Anonymous Doubt
        </span>
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
        Stuck on a concept? Drop your question into the void. Professors and peers can answer without knowing who asked. Safe, brutal, effective.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="E.g., I still don't understand how Dijkstra's algorithm handles negative weights..."
        style={{
          width: "100%", background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "10px 12px", fontSize: 12,
          color: C.textMid, resize: "none", minHeight: 70,
          fontFamily: "'Inter', sans-serif", outline: "none",
          lineHeight: 1.6,
        }}
      />
      <button style={{
        marginTop: 10, background: C.olive, color: C.white,
        border: "none", borderRadius: 20, padding: "9px 20px",
        fontSize: 12, fontWeight: 700, cursor: "pointer",
        fontFamily: "'Syne', sans-serif", letterSpacing: "0.5px",
        transition: "background 0.2s",
      }}
        onMouseEnter={e => e.target.style.background = C.oliveLight}
        onMouseLeave={e => e.target.style.background = C.olive}
      >Cast Into Void</button>
    </div>
  );
};

// ── Course Card ───────────────────────────────────────────────────────────────
const CourseCard = ({ code, name, professor, lastLecture, activeDoubt, doubtText }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 14, padding: 16, marginBottom: 12,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: C.textMuted,
          fontFamily: "'Fira Code', monospace", letterSpacing: "0.5px",
        }}>{code}</span>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 2, fontFamily: "'Syne', sans-serif" }}>
          {name}
        </h3>
        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
          ∙ {professor}
        </p>
      </div>
      <div style={{ fontSize: 18, color: C.textMuted }}>◷</div>
    </div>

    {activeDoubt && (
      <div style={{
        background: C.redLight, border: `1px solid #F5B7B1`,
        borderRadius: 8, padding: "8px 10px", marginBottom: 10,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.red, letterSpacing: "0.5px", marginBottom: 2 }}>
          Active Doubt
        </div>
        <p style={{ fontSize: 12, color: C.red, fontStyle: "italic", lineHeight: 1.4 }}>
          "{doubtText}"
        </p>
      </div>
    )}

    {lastLecture && (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3, letterSpacing: "0.5px" }}>Last Lecture</div>
        <div style={{ fontSize: 12, color: C.textMid, fontWeight: 600 }}>{lastLecture}</div>
      </div>
    )}

    <button style={{
      background: C.olive, color: C.white, border: "none",
      borderRadius: 8, padding: "7px 14px", fontSize: 11,
      fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif",
      letterSpacing: "0.5px",
    }}>ENTER ROOM →</button>
  </div>
);

// ── Project Hub Card ──────────────────────────────────────────────────────────
const ProjectCard = ({ title, description, tags, members, requestToJoin, banner }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 14, overflow: "hidden", marginBottom: 12,
  }}>
    {banner && (
      <div style={{
        height: 80, background: `linear-gradient(135deg, ${C.bg} 0%, ${C.border} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, color: C.olive, fontWeight: 900, letterSpacing: "-1px",
        fontFamily: "'Syne', sans-serif",
      }}>
        {banner}
      </div>
    )}
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {tags.map(tag => (
          <span key={tag} style={{
            background: C.tagGreen, color: C.tagGreenText,
            fontSize: 10, fontWeight: 700, padding: "3px 8px",
            borderRadius: 4, fontFamily: "'Fira Code', monospace",
          }}>{tag}</span>
        ))}
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: "'Syne', sans-serif" }}>
        {title}
      </h3>
      <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
        {description}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {members.map((m, i) => (
            <div key={i} style={{
              width: 26, height: 26, borderRadius: "50%",
              background: [C.olive, C.gold, C.accent][i % 3],
              border: `2px solid ${C.surface}`,
              marginLeft: i > 0 ? -8 : 0, fontSize: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.white, fontWeight: 700,
            }}>{m}</div>
          ))}
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>+{members.length}</span>
        </div>
        {requestToJoin ? (
          <button style={{
            background: C.olive, color: C.white, border: "none",
            borderRadius: 8, padding: "7px 14px", fontSize: 11,
            fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif",
          }}>Request to Join</button>
        ) : (
          <button style={{
            background: "none", color: C.olive, border: `1px solid ${C.olive}`,
            borderRadius: 8, padding: "7px 14px", fontSize: 11,
            fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif",
          }}>View Details</button>
        )}
      </div>
    </div>
  </div>
);

// ── Section Label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, label }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 14, marginTop: 24,
  }}>
    <span style={{ fontSize: 16 }}>{icon}</span>
    <h2 style={{
      fontSize: 14, fontWeight: 700, color: C.olive,
      fontFamily: "'Syne', sans-serif", letterSpacing: "0.5px",
      textTransform: "uppercase",
    }}>{label}</h2>
  </div>
);

// ── Classrooms Page ───────────────────────────────────────────────────────────
function ClassroomsPage() {
  const [year, setYear] = useState("2nd Year");

  const courses = [
    {
      code: "CS 201", name: "Data Structures & Algorithms",
      professor: "Prof. Alan Turing", lastLecture: "Graph Traversals",
      activeDoubt: false,
    },
    {
      code: "CS 202", name: "Operating Systems",
      professor: "Dr. Grace Hopper",
      activeDoubt: true,
      doubtText: "Can someone explain the dining philosophers problem simply?",
    },
    {
      code: "CS 203", name: "Computer Networks",
      professor: "Prof. Vint Cerf", lastLecture: "TCP/IP Sockets",
      activeDoubt: false,
    },
  ];

  const projects = [
    {
      title: "Campus Vault Redesign",
      description: "Join the open-source squad building the next iteration of the student portal. React, Node, and sheer willpower.",
      tags: ["Hackathon Prep", "Web Dev"],
      members: ["A", "K", "R"],
      requestToJoin: true,
      banner: "BUILD IT",
    },
    {
      title: "ML Fundamentals",
      description: "Working through Andrew Ng's course together. Meet every Thursday in the library.",
      tags: ["Study Group"],
      members: ["M", "L"],
      requestToJoin: false,
      banner: null,
    },
  ];

  return (
    <div style={{ padding: "20px 16px 24px" }}>
      <h1 style={{
        fontSize: 32, fontWeight: 800, color: C.olive,
        fontFamily: "'Syne', sans-serif", marginBottom: 16,
        letterSpacing: "-0.5px",
      }}>Classrooms</h1>

      <YearPills active={year} setActive={setYear} />

      <AnonymousDoubt />

      <SectionLabel icon="📚" label="Core Subjects" />
      {courses.map(c => <CourseCard key={c.code} {...c} />)}

      <SectionLabel icon="🚀" label="Project Hubs" />
      {projects.map(p => <ProjectCard key={p.title} {...p} />)}
    </div>
  );
}

// ── Placeholder Pages ─────────────────────────────────────────────────────────
const PlaceholderPage = ({ label }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: 300, color: C.textMuted,
    gap: 10, padding: 32,
  }}>
    <div style={{ fontSize: 40 }}>🚧</div>
    <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.olive, fontSize: 18 }}>{label}</h2>
    <p style={{ fontSize: 13, textAlign: "center" }}>This section is coming soon.</p>
  </div>
);

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("class");

  const pageMap = {
    home: <PlaceholderPage label="Home Feed" />,
    class: <ClassroomsPage />,
    social: <PlaceholderPage label="Social" />,
    market: <PlaceholderPage label="Marketplace" />,
    profile: <PlaceholderPage label="Profile" />,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F4EFE6; color: #1A1A1A; font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #F4EFE6; }
        ::-webkit-scrollbar-thumb { background: #C9B99A; border-radius: 4px; }
        textarea:focus { box-shadow: 0 0 0 2px #2D4A3E44; }
        button:active { transform: scale(0.97); }
      `}</style>

      <div style={{
        minHeight: "100vh", background: C.bg,
        display: "flex", flexDirection: "column",
        maxWidth: 430, margin: "0 auto",
        boxShadow: "0 0 40px rgba(0,0,0,0.12)",
      }}>
        <NavBar />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {pageMap[tab]}
        </div>
        <BottomNav active={tab} setActive={setTab} />
      </div>
    </>
  );
}
