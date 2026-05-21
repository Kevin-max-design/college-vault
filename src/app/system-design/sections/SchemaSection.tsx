"use client";
import { SectionTitle, SubTitle, CodeBlock } from "../components";

export default function SchemaSection() {
  const schemas = [
    {
      name: "User Schema",
      color: "#58a6ff",
      code: `const UserSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['super_admin','principal','ao_office',
                  'exam_cell','placement','hod','faculty','student'],
                  default: 'student' },
  department:   { type: String, required: true },   // e.g. "CSE", "ECE"
  year:         { type: Number, min: 1, max: 4 },   // null for non-students
  isActive:     { type: Boolean, default: true },
  refreshToken: { type: String, default: null },    // hashed refresh token
}, { timestamps: true });`,
    },
    {
      name: "Classroom Schema",
      color: "#3fb950",
      code: `const ClassroomSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  type:        { type: String, enum: ['study', 'project'], required: true },
  description: { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isArchived:  { type: Boolean, default: false },
}, { timestamps: true });

const ClassroomMemberSchema = new mongoose.Schema({
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:        { type: String, enum: ['owner', 'member'], default: 'member' },
  joinedAt:    { type: Date, default: Date.now },
});
ClassroomMemberSchema.index({ classroomId: 1, userId: 1 }, { unique: true });`,
    },
    {
      name: "Post & Comment Schema",
      color: "#f0883e",
      code: `const PostSchema = new mongoose.Schema({
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:     { type: String, required: true },
  attachments: [{ type: String }],              // S3 URLs
  postType:    { type: String, enum: ['doubt', 'update', 'resource'], default: 'doubt' },
  isResolved:  { type: Boolean, default: false },
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  postId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  authorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  content:         { type: String, required: true },
  depth:           { type: Number, default: 0 },  // 0=root, 1=reply, 2=reply-to-reply
}, { timestamps: true });`,
    },
    {
      name: "Notice Schema",
      color: "#e3b341",
      code: `const NoticeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  body:        { type: String, required: true },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope:       { type: String, enum: ['global', 'department', 'year'], required: true },
  targetDept:  { type: String },   // required when scope='department' or 'year'
  targetYear:  { type: Number },   // required when scope='year'
  expiresAt:   { type: Date },     // optional, null = no expiry
}, { timestamps: true });`,
    },
    {
      name: "Message Schema",
      color: "#bc8cff",
      code: `const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  // conversationId = sorted([senderId, receiverId]).join('_')
  senderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:        { type: String, required: true },
  readAt:         { type: Date, default: null },
}, { timestamps: true });
MessageSchema.index({ conversationId: 1, createdAt: -1 }); // cursor pagination`,
    },
    {
      name: "Item (Marketplace) Schema",
      color: "#f85149",
      code: `const ItemSchema = new mongoose.Schema({
  sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  description: { type: String },
  price:       { type: Number, required: true, min: 0 },
  type:        { type: String, enum: ['sell', 'rent'], required: true },
  category:    { type: String, required: true },  // 'books','electronics','misc'
  images:      [{ type: String }],                // S3 URLs, max 5
  status:      { type: String, enum: ['available', 'sold', 'rented'], default: 'available' },
}, { timestamps: true });
ItemSchema.index({ status: 1, category: 1, type: 1 }); // compound for filters`,
    },
  ];

  return (
    <div>
      <SectionTitle>🔹 Database Schema (MongoDB + Mongoose)</SectionTitle>
      {schemas.map((s) => (
        <div key={s.name}>
          <SubTitle>{s.name}</SubTitle>
          <CodeBlock code={s.code} />
        </div>
      ))}
    </div>
  );
}
