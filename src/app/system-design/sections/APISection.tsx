"use client";
import { SectionTitle, SubTitle } from "../components";

export default function APISection() {
  const groups = [
    {
      name: "Auth Routes  /api/auth",
      color: "#58a6ff",
      routes: [
        ["POST", "/send-otp", "Send OTP to college email", "Public"],
        ["POST", "/verify-otp", "Verify OTP, return JWT pair", "Public"],
        ["POST", "/refresh", "Issue new access token using refresh token", "Public"],
        ["POST", "/logout", "Blacklist tokens, clear refresh token", "Authenticated"],
        ["GET", "/me", "Get current user profile", "Authenticated"],
      ],
    },
    {
      name: "Classroom Routes  /api/classroom",
      color: "#3fb950",
      routes: [
        ["POST", "/", "Create a new classroom", "Faculty+"],
        ["GET", "/", "List classrooms for current user", "Authenticated"],
        ["GET", "/:id", "Get classroom details", "Member"],
        ["POST", "/:id/members", "Invite user to classroom", "Owner"],
        ["DELETE", "/:id/members/:userId", "Remove member", "Owner"],
        ["POST", "/:id/posts", "Create a post in classroom", "Member"],
        ["GET", "/:id/posts", "List posts (paginated)", "Member"],
        ["POST", "/:id/posts/:postId/comments", "Add comment / reply", "Member"],
        ["GET", "/:id/posts/:postId/comments", "Get nested comments", "Member"],
        ["PATCH", "/:id/posts/:postId/resolve", "Mark doubt as resolved", "Owner/Faculty"],
      ],
    },
    {
      name: "Admin Routes  /api/admin",
      color: "#f0883e",
      routes: [
        ["POST", "/notices", "Publish a new notice", "Faculty+"],
        ["GET", "/notices", "List notices (filtered by user scope)", "Authenticated"],
        ["PATCH", "/notices/:id", "Update notice", "Publisher/SuperAdmin"],
        ["DELETE", "/notices/:id", "Delete notice", "Publisher/SuperAdmin"],
        ["GET", "/users", "List all users (with filters)", "SuperAdmin"],
        ["PATCH", "/users/:id/role", "Change user role", "SuperAdmin"],
        ["PATCH", "/users/:id/status", "Activate / deactivate user", "SuperAdmin"],
        ["GET", "/audit-logs", "View admin action audit trail", "Principal+"],
      ],
    },
    {
      name: "Chat Routes  /api/chat",
      color: "#bc8cff",
      routes: [
        ["GET", "/conversations", "List conversations for current user", "Authenticated"],
        ["GET", "/conversations/:conversationId/messages", "Get message history (cursor-paginated)", "Participant"],
        ["DELETE", "/messages/:id", "Soft-delete own message", "Sender"],
      ],
    },
    {
      name: "Marketplace Routes  /api/market",
      color: "#f85149",
      routes: [
        ["POST", "/items", "Create a new listing (multipart/form-data)", "Student/Faculty"],
        ["GET", "/items", "List items (filter: type, category, status, price range)", "Authenticated"],
        ["GET", "/items/:id", "Get item details", "Authenticated"],
        ["PATCH", "/items/:id", "Update listing", "Owner"],
        ["PATCH", "/items/:id/status", "Mark as sold/rented", "Owner"],
        ["DELETE", "/items/:id", "Delete listing", "Owner/SuperAdmin"],
      ],
    },
  ];

  const methodColor: Record<string, string> = { GET: "#3fb950", POST: "#58a6ff", PATCH: "#f0883e", DELETE: "#f85149", PUT: "#bc8cff" };

  return (
    <div>
      <SectionTitle>🔹 API Design</SectionTitle>
      {groups.map((g) => (
        <div key={g.name}>
          <SubTitle>{g.name}</SubTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'Fira Code', monospace", marginBottom: "8px" }}>
              <thead>
                <tr style={{ background: "#21262d" }}>
                  {["Method", "Endpoint", "Description", "Auth Required"].map((h) => (
                    <th key={h} style={{ padding: "7px 12px", color: g.color, border: "1px solid #30363d", textAlign: "left", fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.routes.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#161b22" : "#0d1117" }}>
                    <td style={{ padding: "7px 12px", border: "1px solid #21262d", color: methodColor[row[0]] || "#c9d1d9", fontWeight: 700 }}>{row[0]}</td>
                    <td style={{ padding: "7px 12px", border: "1px solid #21262d", color: "#c9d1d9" }}>{row[1]}</td>
                    <td style={{ padding: "7px 12px", border: "1px solid #21262d", color: "#8b949e" }}>{row[2]}</td>
                    <td style={{ padding: "7px 12px", border: "1px solid #21262d", color: "#e3b341" }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
