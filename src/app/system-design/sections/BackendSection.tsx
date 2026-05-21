"use client";
import { SectionTitle, SubTitle, CodeBlock } from "../components";

export default function BackendSection() {
  return (
    <div>
      <SectionTitle>🔹 Backend Architecture</SectionTitle>

      <SubTitle>Folder Structure (MVC + Service Layer)</SubTitle>
      <CodeBlock code={`campus-platform/
├── src/
│   ├── config/
│   │   ├── db.js              # Mongoose connection
│   │   ├── redis.js           # Redis client (ioredis)
│   │   ├── s3.js              # AWS S3 config
│   │   └── socket.js          # Socket.io setup + auth
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js      # Verify JWT, attach req.user
│   │   ├── rbac.middleware.js      # Role-based access control
│   │   ├── validate.middleware.js  # express-validator wrapper
│   │   ├── rateLimiter.js          # express-rate-limit per route
│   │   └── errorHandler.js         # Global error handler
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validator.js
│   │   │
│   │   ├── classroom/
│   │   │   ├── classroom.routes.js
│   │   │   ├── classroom.controller.js
│   │   │   ├── classroom.service.js
│   │   │   └── classroom.validator.js
│   │   │
│   │   ├── admin/
│   │   │   ├── admin.routes.js
│   │   │   ├── admin.controller.js
│   │   │   ├── admin.service.js
│   │   │   └── admin.validator.js
│   │   │
│   │   ├── chat/
│   │   │   ├── chat.routes.js
│   │   │   ├── chat.controller.js
│   │   │   ├── chat.service.js
│   │   │   └── socket.handler.js  # All socket events
│   │   │
│   │   └── marketplace/
│   │       ├── market.routes.js
│   │       ├── market.controller.js
│   │       ├── market.service.js
│   │       └── market.validator.js
│   │
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Classroom.model.js
│   │   ├── ClassroomMember.model.js
│   │   ├── Post.model.js
│   │   ├── Comment.model.js
│   │   ├── Notice.model.js
│   │   ├── Message.model.js
│   │   └── Item.model.js
│   │
│   ├── utils/
│   │   ├── jwt.util.js        # sign / verify tokens
│   │   ├── otp.util.js        # generate + store OTP in Redis
│   │   ├── mailer.util.js     # nodemailer wrapper
│   │   ├── s3.util.js         # presigned URL helpers
│   │   └── apiResponse.util.js # standardized { success, data, message }
│   │
│   ├── constants/
│   │   ├── roles.js           # ROLE_HIERARCHY array
│   │   └── errors.js          # Error code constants
│   │
│   └── app.js                 # Express app bootstrap
│
├── server.js                  # Entry point, HTTP + Socket.io
├── .env.example
└── package.json`} />

      <SubTitle>Key Middleware Implementations</SubTitle>
      <CodeBlock code={`// middleware/auth.middleware.js
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // Check if token is blacklisted in Redis (on logout)
    const isBlacklisted = await redis.get(\`bl_\${token}\`);
    if (isBlacklisted) return res.status(401).json({ success: false, message: 'Token revoked' });

    req.user = decoded;  // { userId, role, department, year }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// middleware/rbac.middleware.js
const ROLE_HIERARCHY = [
  'student', 'faculty', 'hod', 'ao_office',
  'exam_cell', 'placement', 'principal', 'super_admin'
];

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

const requireMinRole = (minRole) => (req, res, next) => {
  const userLevel = ROLE_HIERARCHY.indexOf(req.user.role);
  const minLevel  = ROLE_HIERARCHY.indexOf(minRole);
  if (userLevel < minLevel) {
    return res.status(403).json({ success: false, message: 'Insufficient role' });
  }
  next();
};`} />
    </div>
  );
}
