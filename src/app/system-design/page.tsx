"use client";
import React, { useState } from "react";
import { Badge } from "./components";

import ArchSection from "./sections/ArchSection";
import ModulesSection from "./sections/ModulesSection";
import RolesSection from "./sections/RolesSection";
import DataFlowSection from "./sections/DataFlowSection";
import ERSection from "./sections/ERSection";
import SchemaSection from "./sections/SchemaSection";
import APISection from "./sections/APISection";
import BackendSection from "./sections/BackendSection";
import ScaleSection from "./sections/ScaleSection";
import SecuritySection from "./sections/SecuritySection";

const sections = [
  { id: "arch", label: "Architecture", icon: "⬡" },
  { id: "modules", label: "Modules", icon: "◈" },
  { id: "roles", label: "Role Hierarchy", icon: "◎" },
  { id: "dataflow", label: "Data Flows", icon: "▷" },
  { id: "er", label: "ER Diagram", icon: "⬕" },
  { id: "schema", label: "DB Schema", icon: "⬗" },
  { id: "api", label: "API Design", icon: "◇" },
  { id: "backend", label: "Backend Arch", icon: "⬙" },
  { id: "scale", label: "Scalability", icon: "◈" },
  { id: "security", label: "Security", icon: "⬡" },
] as const;

type SectionId = typeof sections[number]["id"];

const sectionComponents: Record<SectionId, React.ComponentType> = {
  arch: ArchSection,
  modules: ModulesSection,
  roles: RolesSection,
  dataflow: DataFlowSection,
  er: ERSection,
  schema: SchemaSection,
  api: APISection,
  backend: BackendSection,
  scale: ScaleSection,
  security: SecuritySection,
};

export default function SystemDesignPage() {
  const [active, setActive] = useState<SectionId>("arch");
  const ActiveSection = sectionComponents[active];

  return (
    <>
      <style>{`
        body { background: #0d1117 !important; color: #c9d1d9 !important; font-family: 'Syne', sans-serif !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #161b22 0%, #0d1117 100%)",
          borderBottom: "1px solid #21262d",
          padding: "28px 32px 20px",
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "6px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "linear-gradient(135deg, #388bfd, #3fb950)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "20px",
              }}>⬡</div>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#f0f6fc", letterSpacing: "0.5px" }}>
                  Campus Collaboration Platform
                </h1>
                <div style={{ fontSize: "12px", color: "#8b949e", marginTop: "2px", fontFamily: "'Fira Code', monospace" }}>
                  Complete System Design · Production-Ready Architecture
                </div>
              </div>
            </div>
            <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["Node.js + Express", "MongoDB + Mongoose", "Redis", "Socket.io", "JWT + OTP", "AWS S3", "RBAC"].map((t) => (
                <Badge key={t} color="#388bfd">{t}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{
          background: "#161b22",
          borderBottom: "1px solid #21262d",
          overflowX: "auto",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", gap: "0", maxWidth: "1200px", margin: "0 auto", padding: "0 16px" }}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: active === s.id ? "2px solid #388bfd" : "2px solid transparent",
                  color: active === s.id ? "#58a6ff" : "#8b949e",
                  padding: "14px 14px 12px",
                  cursor: "pointer",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: active === s.id ? 700 : 400,
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  letterSpacing: "0.5px",
                }}
              >
                <span style={{ marginRight: "5px" }}>{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", width: "100%" }}>
          <ActiveSection />
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #21262d",
          padding: "16px 32px",
          textAlign: "center",
          color: "#30363d",
          fontSize: "12px",
          fontFamily: "'Fira Code', monospace",
        }}>
          Campus Collaboration Platform · System Design v1.0 · Ready for Development & Presentation
        </div>
      </div>
    </>
  );
}
