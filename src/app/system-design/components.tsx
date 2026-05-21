"use client";
import React from "react";

export const CodeBlock = ({ code }: { code: string }) => (
  <pre style={{
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: "8px",
    padding: "20px",
    overflowX: "auto",
    fontSize: "13px",
    lineHeight: "1.7",
    color: "#e6edf3",
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    margin: "12px 0",
  }}>
    <code>{code}</code>
  </pre>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{
    fontSize: "22px",
    fontFamily: "'Syne', sans-serif",
    color: "#58a6ff",
    borderBottom: "1px solid #21262d",
    paddingBottom: "12px",
    marginBottom: "24px",
    marginTop: "0",
    letterSpacing: "0.5px",
  }}>{children}</h2>
);

export const SubTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{
    fontSize: "15px",
    fontFamily: "'Syne', sans-serif",
    color: "#f0883e",
    margin: "24px 0 12px",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
  }}>{children}</h3>
);

export const Badge = ({ children, color = "#388bfd" }: { children: React.ReactNode; color?: string }) => (
  <span style={{
    background: color + "22",
    color: color,
    border: `1px solid ${color}44`,
    borderRadius: "4px",
    padding: "2px 8px",
    fontSize: "12px",
    fontFamily: "'Fira Code', monospace",
    marginRight: "6px",
    display: "inline-block",
    marginBottom: "4px",
  }}>{children}</span>
);

export const Card = ({ children, accent = "#388bfd" }: { children: React.ReactNode; accent?: string }) => (
  <div style={{
    background: "#161b22",
    border: `1px solid #30363d`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
  }}>{children}</div>
);

export const FlowBox = ({ label, sub, color = "#388bfd", width = "100%" }: { label: string; sub?: string; color?: string; width?: string }) => (
  <div style={{
    background: color + "18",
    border: `1px solid ${color}55`,
    borderRadius: "6px",
    padding: "10px 16px",
    textAlign: "center",
    width,
    boxSizing: "border-box",
  }}>
    <div style={{ color, fontWeight: 700, fontSize: "13px", fontFamily: "'Syne', sans-serif" }}>{label}</div>
    {sub && <div style={{ color: "#8b949e", fontSize: "11px", marginTop: "3px" }}>{sub}</div>}
  </div>
);

export const Arrow = ({ label = "" }: { label?: string }) => (
  <div style={{ textAlign: "center", color: "#8b949e", fontSize: "12px", padding: "4px 0" }}>
    {label && <span style={{ marginRight: "4px", color: "#8b949e" }}>{label}</span>}▼
  </div>
);

export const HArrow = () => (
  <div style={{ color: "#8b949e", padding: "0 6px", alignSelf: "center", fontSize: "16px" }}>→</div>
);
