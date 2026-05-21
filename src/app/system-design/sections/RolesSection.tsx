"use client";
import { SectionTitle, SubTitle, FlowBox, Arrow } from "../components";

export default function RolesSection() {
  const levels = [
    { role: "Super Admin", desc: "Full system control. Manages all users and settings.", color: "#f85149", level: 0 },
    { role: "Principal", desc: "Approves notices. Views all reports. Cannot modify code/data directly.", color: "#f0883e", level: 1 },
    { role: "AO Office", desc: "Manages student records, fee structures, official communications.", color: "#e3b341", level: 2 },
    { role: "Examination Cell", desc: "Manages exam schedules, results, and grade notices.", color: "#3fb950", level: 2 },
    { role: "Placement Office", desc: "Posts placement drives, manages student placement data.", color: "#3fb950", level: 2 },
    { role: "HOD", desc: "Manages department classrooms, approves faculty, sees dept notices.", color: "#58a6ff", level: 3 },
    { role: "Faculty", desc: "Creates classrooms, posts notices within dept scope, grades.", color: "#bc8cff", level: 4 },
    { role: "Student", desc: "Joins classrooms, posts doubts, participates in discussions.", color: "#8b949e", level: 5 },
  ];

  const permissions = [
    ["Feature", "Student", "Faculty", "HOD", "Admin Cells", "Principal", "Super Admin"],
    ["Join Classroom", "✓", "✓", "✓", "✗", "✗", "✓"],
    ["Create Classroom", "✗", "✓", "✓", "✗", "✗", "✓"],
    ["Post Thread", "✓", "✓", "✓", "✗", "✗", "✓"],
    ["Global Notice", "✗", "✗", "✗", "✓", "✓", "✓"],
    ["Dept Notice", "✗", "✓", "✓", "✓", "✓", "✓"],
    ["Manage Users", "✗", "✗", "✗", "✗", "✗", "✓"],
    ["Marketplace", "✓", "✓", "✓", "✗", "✗", "✓"],
    ["Chat", "✓", "✓", "✓", "✓", "✓", "✓"],
    ["View Audit Logs", "✗", "✗", "✗", "✗", "✓", "✓"],
  ];

  return (
    <div>
      <SectionTitle>🔹 Role Hierarchy</SectionTitle>
      <SubTitle>Top-Down Authority Chain</SubTitle>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
        {levels.filter(l => l.level <= 1).map((l, i) => (
          <div key={l.role} style={{ width: `${90 - l.level * 8}%`, marginBottom: "0" }}>
            <FlowBox label={l.role} sub={l.desc} color={l.color} width="100%" />
            <Arrow />
          </div>
        ))}

        <div style={{ width: "90%", marginBottom: "0" }}>
          <div style={{ color: "#8b949e", fontSize: "11px", textAlign: "center", marginBottom: "6px", letterSpacing: "1px" }}>
            — PARALLEL ADMIN CELLS (same authority level) —
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {levels.filter(l => l.level === 2).map((l) => (
              <FlowBox key={l.role} label={l.role} sub={l.desc} color={l.color} width="100%" />
            ))}
          </div>
        </div>
        <Arrow />

        {levels.filter(l => l.level > 2).map((l) => (
          <div key={l.role} style={{ width: `${90 - l.level * 6}%`, marginBottom: "0" }}>
            <FlowBox label={l.role} sub={l.desc} color={l.color} width="100%" />
            {l.level < 5 && <Arrow />}
          </div>
        ))}
      </div>

      <SubTitle>Permission Matrix</SubTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'Fira Code', monospace" }}>
          <thead>
            <tr>
              {permissions[0].map((h, i) => (
                <th key={i} style={{
                  background: "#21262d",
                  color: i === 0 ? "#f0883e" : "#58a6ff",
                  padding: "8px 10px",
                  textAlign: i === 0 ? "left" : "center",
                  border: "1px solid #30363d",
                  fontWeight: 700,
                  fontSize: "11px",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.slice(1).map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? "#161b22" : "#0d1117" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: "7px 10px",
                    border: "1px solid #21262d",
                    textAlign: ci === 0 ? "left" : "center",
                    color: cell === "✓" ? "#3fb950" : cell === "✗" ? "#f85149" : "#c9d1d9",
                    fontWeight: ci === 0 ? 600 : 400,
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
