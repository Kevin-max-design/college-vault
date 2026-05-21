"use client";
import { SectionTitle, SubTitle, Card, FlowBox, Arrow } from "../components";

export default function ScaleSection() {
  return (
    <div>
      <SectionTitle>🔹 Scalability Plan</SectionTitle>

      <SubTitle>Phase 1: Monolith (0–500 users)</SubTitle>
      <Card accent="#3fb950">
        <div style={{ color: "#c9d1d9", fontSize: "13px", lineHeight: "1.9" }}>
          Single Node.js Express app on a single VPS. MongoDB Atlas (M10 tier). Redis on same server.
          PM2 cluster mode to use all CPU cores. Good enough for a college pilot.
        </div>
      </Card>

      <SubTitle>Phase 2: Modular Monolith + Caching (500–5,000 users)</SubTitle>
      <Card accent="#f0883e">
        <div style={{ color: "#c9d1d9", fontSize: "13px", lineHeight: "1.9" }}>
          Add Nginx as reverse proxy + load balancer across 2 app servers.<br />
          Redis caching for: notice lists, classroom member lists, user profiles (TTL: 5 min).<br />
          MongoDB Atlas M30 with read replicas. Cloudflare CDN for static assets + S3 images.<br />
          Separate Socket.io server with Redis adapter (sticky sessions or Redis pub/sub).
        </div>
      </Card>

      <SubTitle>Phase 3: Microservices (5,000+ users)</SubTitle>
      <Card accent="#58a6ff">
        <div style={{ color: "#c9d1d9", fontSize: "13px", lineHeight: "1.9" }}>
          Split each module into independent services. Introduce an API Gateway (Kong or custom Express gateway).<br />
          Each service gets its own MongoDB database. Services communicate via message queue (BullMQ / Redis Streams).<br />
          Chat service becomes a dedicated cluster with Socket.io Redis adapter.<br />
          Kubernetes (K8s) for container orchestration. Horizontal pod autoscaling per service.
        </div>
      </Card>

      <SubTitle>Infrastructure Diagram (Phase 2+)</SubTitle>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
        <FlowBox label="Cloudflare CDN" sub="Static assets, S3 image edge caching" color="#f0883e" width="55%" />
        <Arrow />
        <FlowBox label="Nginx Load Balancer" sub="Round-robin across app servers. SSL termination." color="#e3b341" width="55%" />
        <Arrow />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", width: "75%", marginBottom: "4px" }}>
          <FlowBox label="App Server 1" sub="Node.js + PM2" color="#58a6ff" />
          <FlowBox label="App Server 2" sub="Node.js + PM2" color="#58a6ff" />
          <FlowBox label="Socket Server" sub="Socket.io cluster" color="#bc8cff" />
        </div>
        <Arrow />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", width: "75%" }}>
          <FlowBox label="MongoDB Atlas" sub="Primary + 2 replicas" color="#3fb950" />
          <FlowBox label="Redis Cluster" sub="Cache + sessions + pub/sub" color="#f85149" />
          <FlowBox label="AWS S3" sub="File/image storage" color="#f0883e" />
        </div>
      </div>
    </div>
  );
}
