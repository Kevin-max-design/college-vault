"use client";
import { SectionTitle, Card } from "../components";

export default function SecuritySection() {
  const items = [
    {
      category: "Authentication",
      color: "#58a6ff",
      points: [
        "JWT access tokens expire in 15 minutes. Refresh tokens stored hashed in DB.",
        "OTP expires in 10 minutes. Stored in Redis with TTL. Max 3 attempts per email.",
        "On logout: access token blacklisted in Redis for remaining TTL, refresh token cleared from DB.",
        "College email domain validation (@college.edu) before sending OTP.",
      ],
    },
    {
      category: "Authorization (RBAC)",
      color: "#3fb950",
      points: [
        "Every protected route has explicit middleware: verifyToken → requireRole (or requireMinRole).",
        "Resource-level ownership checks (e.g., only post author or faculty can delete a post).",
        "Notice scope enforced on every GET — server filters by user's department and year, never trusts client.",
        "Classroom membership verified before any classroom operation.",
      ],
    },
    {
      category: "Data Validation",
      color: "#f0883e",
      points: [
        "express-validator on all POST/PATCH routes. Reject malformed inputs early.",
        "Mongoose schema-level validation as second layer (enum, required, min/max).",
        "File uploads: MIME type whitelist (image/jpeg, image/png, application/pdf). Max size 10MB.",
        "MongoDB injection prevention: use mongoose query builders, never raw $where.",
      ],
    },
    {
      category: "Rate Limiting",
      color: "#f85149",
      points: [
        "OTP endpoint: 3 requests per email per 15 minutes (Redis counter with TTL).",
        "Login endpoint: 10 attempts per IP per minute (express-rate-limit).",
        "API-wide: 100 requests per minute per authenticated user.",
        "File upload: 5 uploads per user per minute.",
      ],
    },
    {
      category: "Additional Hardening",
      color: "#bc8cff",
      points: [
        "helmet.js: sets secure HTTP headers (CSP, HSTS, X-Frame-Options).",
        "CORS: whitelist only the frontend domain. Credentials mode enabled.",
        "Environment secrets in .env (never committed). Use secret manager in production.",
        "Audit log for all admin write operations: who did what, when, on which resource.",
      ],
    },
  ];

  return (
    <div>
      <SectionTitle>🔹 Security Design</SectionTitle>
      {items.map((item) => (
        <Card key={item.category} accent={item.color}>
          <div style={{ color: item.color, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginBottom: "12px", fontSize: "14px" }}>
            {item.category}
          </div>
          <ul style={{ color: "#c9d1d9", fontSize: "13px", margin: 0, paddingLeft: "20px", lineHeight: "1.9" }}>
            {item.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </Card>
      ))}
    </div>
  );
}
