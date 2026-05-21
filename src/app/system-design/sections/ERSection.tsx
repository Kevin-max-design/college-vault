"use client";
import { SectionTitle, SubTitle } from "../components";

export default function ERSection() {
  const entities = [
    {
      name: "User",
      color: "#58a6ff",
      pk: "_id: ObjectId",
      attrs: ["name: String", "email: String (unique)", "passwordHash: String", "role: Enum[...]", "department: String", "year: Number", "isActive: Boolean", "createdAt: Date"],
      fks: [],
    },
    {
      name: "Classroom",
      color: "#3fb950",
      pk: "_id: ObjectId",
      attrs: ["name: String", "type: Enum[study, project]", "description: String", "isArchived: Boolean", "createdAt: Date"],
      fks: ["createdBy → User._id"],
    },
    {
      name: "ClassroomMember",
      color: "#3fb950",
      pk: "_id: ObjectId",
      attrs: ["role: Enum[owner, member]", "joinedAt: Date"],
      fks: ["classroomId → Classroom._id", "userId → User._id"],
    },
    {
      name: "Post",
      color: "#f0883e",
      pk: "_id: ObjectId",
      attrs: ["content: String", "attachments: [String]", "postType: Enum[doubt, update, resource]", "isResolved: Boolean", "createdAt: Date"],
      fks: ["classroomId → Classroom._id", "authorId → User._id"],
    },
    {
      name: "Comment",
      color: "#f0883e",
      pk: "_id: ObjectId",
      attrs: ["content: String", "depth: Number (0=root)", "createdAt: Date"],
      fks: ["postId → Post._id", "authorId → User._id", "parentCommentId → Comment._id (nullable)"],
    },
    {
      name: "Notice",
      color: "#e3b341",
      pk: "_id: ObjectId",
      attrs: ["title: String", "body: String", "scope: Enum[global, department, year]", "targetDept: String", "targetYear: Number", "expiresAt: Date", "createdAt: Date"],
      fks: ["publishedBy → User._id"],
    },
    {
      name: "Message",
      color: "#bc8cff",
      pk: "_id: ObjectId",
      attrs: ["content: String", "readAt: Date", "createdAt: Date"],
      fks: ["conversationId: String (senderId+receiverId sorted)", "senderId → User._id", "receiverId → User._id"],
    },
    {
      name: "Item (Marketplace)",
      color: "#f85149",
      pk: "_id: ObjectId",
      attrs: ["title: String", "description: String", "price: Number", "type: Enum[sell, rent]", "images: [String]", "category: String", "status: Enum[available, sold, rented]", "createdAt: Date"],
      fks: ["sellerId → User._id"],
    },
  ];

  const cardinality = [
    ["User", "1", "creates", "N", "Classroom", "One user creates many classrooms"],
    ["User", "M", "joins (via ClassroomMember)", "N", "Classroom", "Many users in many classrooms"],
    ["Classroom", "1", "contains", "N", "Post", "One classroom has many posts"],
    ["Post", "1", "has", "N", "Comment", "One post has many comments (nested)"],
    ["Comment", "1", "replies to", "N", "Comment", "Self-referential: parent → children"],
    ["User", "1", "publishes", "N", "Notice", "One user publishes many notices"],
    ["User", "1", "sends", "N", "Message", "One user sends many messages"],
    ["User", "1", "lists", "N", "Item", "One user lists many marketplace items"],
  ];

  return (
    <div>
      <SectionTitle>🔹 ER Diagram</SectionTitle>

      <SubTitle>Entity Definitions</SubTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {entities.map((e) => (
          <div key={e.name} style={{
            background: "#161b22",
            border: `1px solid ${e.color}44`,
            borderTop: `3px solid ${e.color}`,
            borderRadius: "8px",
            padding: "14px",
          }}>
            <div style={{ color: e.color, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginBottom: "8px", fontSize: "14px" }}>
              {e.name}
            </div>
            <div style={{ fontFamily: "'Fira Code', monospace", fontSize: "11px", color: "#e3b341", marginBottom: "6px" }}>
              PK: {e.pk}
            </div>
            {e.fks.map((fk) => (
              <div key={fk} style={{ fontFamily: "'Fira Code', monospace", fontSize: "11px", color: "#f0883e", marginBottom: "3px" }}>
                FK: {fk}
              </div>
            ))}
            <div style={{ borderTop: "1px solid #21262d", marginTop: "8px", paddingTop: "8px" }}>
              {e.attrs.map((a) => (
                <div key={a} style={{ fontFamily: "'Fira Code', monospace", fontSize: "11px", color: "#8b949e", lineHeight: "1.8" }}>
                  {a}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <SubTitle>Cardinality Relationships</SubTitle>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'Fira Code', monospace" }}>
        <thead>
          <tr style={{ background: "#21262d" }}>
            {["Entity A", "Card.", "Relationship", "Card.", "Entity B", "Description"].map((h) => (
              <th key={h} style={{ padding: "8px 10px", color: "#58a6ff", border: "1px solid #30363d", textAlign: "left", fontSize: "11px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cardinality.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#161b22" : "#0d1117" }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "7px 10px",
                  border: "1px solid #21262d",
                  color: j === 1 || j === 3 ? "#f85149" : j === 5 ? "#8b949e" : "#c9d1d9",
                  fontWeight: j === 0 || j === 4 ? 700 : 400,
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
