"use client";
import { SectionTitle, Card, Badge } from "../components";

export default function ModulesSection() {
  const modules = [
    {
      name: "Auth Service",
      color: "#58a6ff",
      responsibilities: [
        "College email validation (OTP via SMTP)",
        "JWT access token (15min) + refresh token (7d)",
        "Token blacklisting on logout (Redis)",
        "Role assignment on registration",
      ],
      tech: ["bcrypt", "nodemailer", "jsonwebtoken", "Redis"],
    },
    {
      name: "Classroom Service",
      color: "#3fb950",
      responsibilities: [
        "Create Study / Project classrooms",
        "Invite members by role or email",
        "Doubt-based posts with nested replies",
        "File attachments (S3 signed URLs)",
      ],
      tech: ["MongoDB", "S3", "multer", "mongoose"],
    },
    {
      name: "Admin Service",
      color: "#f0883e",
      responsibilities: [
        "Notice publishing with scope (global / dept / year)",
        "User management (activate, deactivate, role-change)",
        "Audit logs for all admin actions",
        "Hierarchical permission enforcement",
      ],
      tech: ["RBAC middleware", "audit-log", "MongoDB"],
    },
    {
      name: "Chat Service",
      color: "#bc8cff",
      responsibilities: [
        "1-to-1 real-time messaging via Socket.io",
        "Message persistence in MongoDB",
        "Read receipts and online presence",
        "Chat history pagination (cursor-based)",
      ],
      tech: ["Socket.io", "Redis (presence)", "MongoDB"],
    },
    {
      name: "Marketplace Service",
      color: "#f85149",
      responsibilities: [
        "Post items for sale or rent",
        "Image upload (up to 5 images per listing)",
        "Search & filter by category/price/type",
        "Mark as sold/rented, contact seller",
      ],
      tech: ["MongoDB", "S3", "multer", "express-validator"],
    },
  ];

  return (
    <div>
      <SectionTitle>🔹 Module Breakdown</SectionTitle>
      {modules.map((m) => (
        <Card key={m.name} accent={m.color}>
          <div style={{ color: m.color, fontWeight: 700, fontSize: "16px", marginBottom: "12px", fontFamily: "'Syne', sans-serif" }}>
            {m.name}
          </div>
          <ul style={{ color: "#c9d1d9", fontSize: "13px", margin: "0 0 12px 0", paddingLeft: "20px", lineHeight: "1.9" }}>
            {m.responsibilities.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <div>{m.tech.map((t) => <Badge key={t} color={m.color}>{t}</Badge>)}</div>
        </Card>
      ))}
    </div>
  );
}
