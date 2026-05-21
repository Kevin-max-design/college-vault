"use client";
import { SectionTitle, SubTitle, FlowBox, Arrow, Card } from "../components";

export default function ArchSection() {
  return (
    <div>
      <SectionTitle>🔹 High-Level Architecture</SectionTitle>
      <p style={{ color: "#8b949e", marginBottom: "20px", fontSize: "14px" }}>
        Clean top-down layered architecture. Each layer only communicates with the layer directly below it.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0", alignItems: "center" }}>
        <FlowBox label="CLIENT LAYER" sub="Web Browser / Mobile App (React / React Native)" color="#58a6ff" width="70%" />
        <Arrow label="HTTPS / WSS" />
        <FlowBox label="API GATEWAY" sub="Rate Limiting · Auth Validation · Request Routing · CORS" color="#3fb950" width="70%" />
        <Arrow />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px", width: "90%", marginBottom: "4px" }}>
          {[
            ["Auth Service", "/auth/*"],
            ["Classroom Service", "/classroom/*"],
            ["Admin Service", "/admin/*"],
            ["Chat Service", "/chat/*"],
            ["Marketplace", "/market/*"],
          ].map(([name, route]) => (
            <FlowBox key={name} label={name} sub={route} color="#f0883e" />
          ))}
        </div>
        <Arrow />
        <FlowBox label="SHARED MIDDLEWARE" sub="JWT Verification · RBAC Guard · Request Validator · Logger" color="#bc8cff" width="70%" />
        <Arrow />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", width: "70%", marginBottom: "4px" }}>
          <FlowBox label="MongoDB" sub="Primary DB" color="#3fb950" />
          <FlowBox label="Redis" sub="Cache + Sessions" color="#f85149" />
          <FlowBox label="Socket.io" sub="Real-time WS" color="#58a6ff" />
        </div>
        <Arrow />
        <FlowBox label="INFRASTRUCTURE" sub="Nginx Load Balancer · CDN (Cloudflare) · Object Storage (S3)" color="#8b949e" width="70%" />
      </div>

      <SubTitle>Communication Protocols</SubTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Card accent="#58a6ff">
          <div style={{ color: "#58a6ff", fontWeight: 700, marginBottom: "8px", fontFamily: "'Syne', sans-serif" }}>REST (HTTP/HTTPS)</div>
          <div style={{ color: "#8b949e", fontSize: "13px" }}>All CRUD operations — auth, classroom, admin, marketplace. JSON request/response with JWT bearer tokens.</div>
        </Card>
        <Card accent="#3fb950">
          <div style={{ color: "#3fb950", fontWeight: 700, marginBottom: "8px", fontFamily: "'Syne', sans-serif" }}>WebSocket (Socket.io)</div>
          <div style={{ color: "#8b949e", fontSize: "13px" }}>Real-time 1-to-1 chat only. Authenticated via JWT handshake. Rooms namespaced by conversation ID.</div>
        </Card>
      </div>
    </div>
  );
}
