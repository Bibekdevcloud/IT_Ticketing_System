const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const client = require("prom-client");
require("dotenv").config();

const app = express();

// ===== Prometheus metrics =====
client.collectDefaultMetrics();
const register = client.register;


app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ====== In-memory "database" ======
let users = [];
let nextUserId = 1;

let tickets = [];
let nextTicketId = 1;

// ====== Helpers ======
function createToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, name: user.name, department: user.department },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const [type, token] = auth.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ====== Routes ======
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ===== Prometheus scrape endpoint =====
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});


app.post("/api/auth/signup", async (req, res) => {
  const { name, department, password } = req.body;

  if (!name || !department || !password) {
    return res.status(400).json({ error: "name, department, password are required" });
  }

  const normalizedName = name.trim().toLowerCase();
  const exists = users.some((u) => u.name.trim().toLowerCase() === normalizedName);
  if (exists) return res.status(409).json({ error: "This name is already taken. Choose another." });

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: nextUserId++,
    name: name.trim(),
    department: department.trim(),
    passwordHash,
    role: "user"
  };

  users.push(newUser);

  const token = createToken(newUser);
  res.status(201).json({
    message: "account created",
    token,
    user: { id: newUser.id, name: newUser.name, department: newUser.department, role: newUser.role }
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "name and password are required" });
  }

  const normalizedName = name.trim().toLowerCase();
  const user = users.find((u) => u.name.trim().toLowerCase() === normalizedName);

  if (!user) return res.status(401).json({ error: "Invalid name or password" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid name or password" });

  const token = createToken(user);
  res.json({
    message: "login success",
    token,
    user: { id: user.id, name: user.name, department: user.department, role: user.role }
  });
});

app.get("/api/tickets", authMiddleware, (req, res) => res.json(tickets));

app.post("/api/tickets", authMiddleware, (req, res) => {
  const { title, description = "", priority = "low" } = req.body;

  const allowedPriorities = ["low", "medium", "high"];
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!allowedPriorities.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${allowedPriorities.join(", ")}` });
  }

  const newTicket = {
    id: nextTicketId++,
    title,
    description,
    priority,
    status: "open",
    createdAt: new Date().toISOString(),
    createdByUserId: req.user.userId,
    requesterName: req.user.name,
    department: req.user.department
  };

  tickets.push(newTicket);
  res.status(201).json(newTicket);
});

app.delete("/api/tickets/:id", authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "id must be a number" });

  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ error: "ticket not found" });

  const deleted = tickets.splice(index, 1)[0];
  res.json({ message: "ticket deleted", deleted });
});

app.patch("/api/tickets/:id", authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const allowedStatuses = ["open", "in_progress", "resolved"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(", ")}` });
  }

  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return res.status(404).json({ error: "ticket not found" });

  ticket.status = status;
  res.json(ticket);
});

module.exports = app;

