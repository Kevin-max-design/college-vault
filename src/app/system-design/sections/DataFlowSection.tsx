"use client";
import { SectionTitle, SubTitle, FlowBox, Arrow } from "../components";

export default function DataFlowSection() {
  return (
    <div>
      <SectionTitle>🔹 Data Flow Diagrams</SectionTitle>

      <SubTitle>1. Login Flow (Email + OTP + JWT)</SubTitle>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
        <FlowBox label="User enters college email" color="#58a6ff" width="60%" />
        <Arrow label="POST /auth/send-otp" />
        <FlowBox label="Server: Validate @college.edu domain" color="#3fb950" width="60%" />
        <Arrow label="SMTP" />
        <FlowBox label="6-digit OTP sent to email (expires 10 min, stored in Redis)" color="#3fb950" width="60%" />
        <Arrow label="POST /auth/verify-otp" />
        <FlowBox label="Server: Verify OTP from Redis" color="#f0883e" width="60%" />
        <Arrow />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", width: "60%" }}>
          <FlowBox label="Generate JWT Access Token (15min)" color="#bc8cff" />
          <FlowBox label="Generate Refresh Token (7d, stored in DB)" color="#bc8cff" />
        </div>
        <Arrow />
        <FlowBox label="Return: { accessToken, refreshToken, user }" color="#58a6ff" width="60%" />
        <Arrow />
        <FlowBox label="Client stores tokens. Attaches Bearer token to every request." color="#8b949e" width="60%" />
      </div>

      <SubTitle>2. Classroom Post Flow</SubTitle>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
        <FlowBox label="Faculty / Student submits a Post (text + optional file)" color="#58a6ff" width="60%" />
        <Arrow label="POST /classroom/:id/posts" />
        <FlowBox label="JWT Middleware: Verify token, extract userId + role" color="#f0883e" width="60%" />
        <Arrow />
        <FlowBox label="RBAC Guard: Confirm user is a member of this classroom" color="#f0883e" width="60%" />
        <Arrow label="if file attached" />
        <FlowBox label="Multer → Upload file to S3 → store S3 URL in post" color="#3fb950" width="60%" />
        <Arrow />
        <FlowBox label="Save Post document to MongoDB (classroomId, authorId, content, attachments)" color="#3fb950" width="60%" />
        <Arrow />
        <FlowBox label="Return: Created post object with 201 Created" color="#58a6ff" width="60%" />
      </div>

      <SubTitle>3. Notice Publishing Flow</SubTitle>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
        <FlowBox label="Admin creates notice with: title, body, scope, targetDept, targetYear" color="#f0883e" width="65%" />
        <Arrow label="POST /admin/notices" />
        <FlowBox label="RBAC: Only roles ≥ Faculty can publish. Scope checked against role." color="#f85149" width="65%" />
        <Arrow />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", width: "65%", marginBottom: "4px" }}>
          <FlowBox label="GLOBAL scope → visible to all users" color="#3fb950" />
          <FlowBox label="DEPARTMENT scope → filtered by dept field" color="#e3b341" />
          <FlowBox label="YEAR scope → filtered by year field" color="#58a6ff" />
        </div>
        <Arrow />
        <FlowBox label="Save to MongoDB with scope metadata. Soft-expiry supported." color="#3fb950" width="65%" />
        <Arrow />
        <FlowBox label="GET /notices → query filtered by user's dept + year + role" color="#58a6ff" width="65%" />
      </div>

      <SubTitle>4. Real-time Chat Flow</SubTitle>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
        <FlowBox label="Client connects to Socket.io server with JWT in handshake auth" color="#58a6ff" width="65%" />
        <Arrow label="WS Handshake" />
        <FlowBox label="Server verifies JWT, maps socket.id → userId in Redis" color="#f0883e" width="65%" />
        <Arrow label="socket.join(conversationId)" />
        <FlowBox label="Client emits: send_message { conversationId, content }" color="#bc8cff" width="65%" />
        <Arrow />
        <FlowBox label="Server: Save message to MongoDB (async, non-blocking)" color="#3fb950" width="65%" />
        <Arrow label="socket.to(conversationId).emit('new_message')" />
        <FlowBox label="Receiver gets real-time message event. Emits read_receipt." color="#58a6ff" width="65%" />
        <Arrow />
        <FlowBox label="Sender receives: { delivered: true, readAt: timestamp }" color="#8b949e" width="65%" />
      </div>
    </div>
  );
}
