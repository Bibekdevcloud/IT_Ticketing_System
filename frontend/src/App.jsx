import { useEffect, useMemo, useState } from "react";

export default function App() {
  const API_URL = import.meta.env.VITE_API_URL || "";

  const COMPANY = "NorthBridge Technologies";
  const APP = "Internal IT Ticket System";

  // ---- Session ----
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // ---- Auth form ----
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");

  // ---- Tickets ----
  const [tickets, setTickets] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("low");

  // ---- UI ----
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const meta = useMemo(
    () => ({
      priority: {
        low: { bg: "#e7f6ec", fg: "#137333", label: "Low" },
        medium: { bg: "#fff4e5", fg: "#9a5b00", label: "Medium" },
        high: { bg: "#fde8e8", fg: "#b42318", label: "High" }
      },
      status: {
        open: { bg: "#eef2ff", fg: "#3730a3", label: "Open" },
        in_progress: { bg: "#ecfeff", fg: "#0e7490", label: "In Progress" },
        resolved: { bg: "#e7f6ec", fg: "#137333", label: "Resolved" }
      }
    }),
    []
  );

  function saveSession(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
  }

  function logout() {
    setToken("");
    setUser(null);
    setTickets([]);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setError("");
  }

  // ---- Small API helpers (THIS is where token is used) ----
  async function requestJson(method, path, payload) {
    const res = await fetch (path, {
      method,
      headers: {
        ...(payload ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  const postJson = (path, payload) => requestJson("POST", path, payload);
  const getJson = (path) => requestJson("GET", path);
  const patchJson = (path, payload) => requestJson("PATCH", path, payload);
  const deleteJson = (path) => requestJson("DELETE", path);

  async function signup(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      const data = await postJson("/api/auth/signup", { name, department, password });
      saveSession(data.token, data.user);
      setName("");
      setDepartment("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      const data = await postJson("/api/auth/login", { name, password });
      saveSession(data.token, data.user);
      setName("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTickets() {
    try {
      setError("");
      setLoading(true);
      const data = await getJson("/api/tickets");
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTicket(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);

      await postJson("/api/tickets", { title, description, priority });

      setTitle("");
      setDescription("");
      setPriority("low");
      await fetchTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTicket(id) {
    const ok = window.confirm("Delete this ticket?");
    if (!ok) return;

    try {
      setError("");
      setBusyId(id);
      await deleteJson(`/api/tickets/${id}`);
      await fetchTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function resolveTicket(id) {
    try {
      setError("");
      setBusyId(id);
      await patchJson(`/api/tickets/${id}`, { status: "resolved" });
      await fetchTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (token) fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---- Styles ----
  const page = { minHeight: "100vh", background: "#f6f7fb", padding: "24px 32px" };
  const wrap = { width: "100%", maxWidth: "none", margin: 0, display: "grid", gap: 18 };
  const card = { background: "white", borderRadius: 14, padding: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" };
  const input = { border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 14, background: "white", color: "#0f172a" };
  const label = { display: "grid", gap: 6 };
  const labelTxt = { fontSize: 12, color: "#334155", fontWeight: 900 };
  const btn = { border: "1px solid #e2e8f0", background: "white", color: "#0f172a", padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 900 };
  const btnPrimary = { border: "none", background: "#0f172a", color: "white", padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 900 };
  const badge = { fontSize: 12, fontWeight: 900, padding: "6px 10px", borderRadius: 999 };

  // ---- Auth Screen ----
  if (!token || !user) {
    return (
      <div style={page}>
        <div style={{ maxWidth: 520, margin: "40px auto" }}>
          <div style={card}>
            <div style={{ fontSize: 12, letterSpacing: 1, color: "#64748b", textTransform: "uppercase" }}>
              {COMPANY}
            </div>

            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: "#0f172a" }}>
              {APP}
            </div>

            <div style={{ color: "#475569", marginTop: 8, fontSize: 14 }}>
              Sign in to access the internal help desk.
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setMode("login")}
                style={mode === "login" ? { ...btn, background: "#0f172a", color: "white", borderColor: "#0f172a" } : btn}
              >
                Sign In
              </button>

              <button
                onClick={() => setMode("signup")}
                style={mode === "signup" ? { ...btn, background: "#0f172a", color: "white", borderColor: "#0f172a" } : btn}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div style={{ marginTop: 12, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", padding: 10, borderRadius: 10, fontSize: 14 }}>
                {error}
              </div>
            )}

            {mode === "signup" ? (
              <form onSubmit={signup} style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <label style={label}>
                  <span style={labelTxt}>Name (unique)</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
                </label>

                <label style={label}>
                  <span style={labelTxt}>Department</span>
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} style={input} />
                </label>

                <label style={label}>
                  <span style={labelTxt}>Password</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
                </label>

                <button type="submit" disabled={loading} style={btnPrimary}>
                  {loading ? "Working..." : "Create Account"}
                </button>
              </form>
            ) : (
              <form onSubmit={login} style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <label style={label}>
                  <span style={labelTxt}>Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
                </label>

                <label style={label}>
                  <span style={labelTxt}>Password</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
                </label>

                <button type="submit" disabled={loading} style={btnPrimary}>
                  {loading ? "Working..." : "Sign In"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- App Screen ----
  return (
    <div style={page}>
      <div style={wrap}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 1, color: "#64748b", textTransform: "uppercase" }}>
                {COMPANY}
              </div>

              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginTop: 6 }}>
                {APP}
              </div>

              <div style={{ color: "#475569", marginTop: 6, fontSize: 14 }}>
                Signed in as <b>{user.name}</b> • {user.department}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={fetchTickets} style={btn}>Refresh</button>
              <button onClick={logout} style={{ ...btn, borderColor: "#ef4444", color: "#b91c1c" }}>Sign Out</button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", padding: 10, borderRadius: 10, fontSize: 14 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 18 }}>
          <div style={{ ...card, height: "fit-content" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 16 }}>
              Create a Ticket
            </div>

            <form onSubmit={createTicket} style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <label style={label}>
                <span style={labelTxt}>Issue Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} />
              </label>

              <label style={label}>
                <span style={labelTxt}>Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...input, resize: "vertical" }} rows={4} />
              </label>

              <label style={label}>
                <span style={labelTxt}>Priority</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={input}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? "Working..." : "Submit Ticket"}
              </button>
            </form>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 16 }}>Tickets</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>{tickets.length} total</div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {loading ? (
                <div style={{ color: "#475569" }}>Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div style={{ color: "#475569" }}>No tickets found.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {tickets
                    .slice()
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((t) => {
                      const p = meta.priority[t.priority] || meta.priority.low;
                      const s = meta.status[t.status] || meta.status.open;

                      return (
                        <div key={t.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 15 }}>
                                #{t.id} — {t.title}
                              </div>
                              <div style={{ marginTop: 6, color: "#475569", fontSize: 13 }}>
                                <b>{t.requesterName}</b> • {t.department} • {new Date(t.createdAt).toLocaleString()}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ ...badge, background: p.bg, color: p.fg }}>Priority: {p.label}</span>
                              <span style={{ ...badge, background: s.bg, color: s.fg }}>{s.label}</span>
                            </div>
                          </div>

                          {t.description && (
                            <div style={{ marginTop: 10, color: "#334155", fontSize: 14, lineHeight: 1.4 }}>
                              {t.description}
                            </div>
                          )}

                          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {t.status !== "resolved" && (
                              <button
                                onClick={() => resolveTicket(t.id)}
                                disabled={busyId === t.id}
                                style={{ ...btn, background: "#0ea5e9", borderColor: "#0284c7", color: "white", opacity: busyId === t.id ? 0.7 : 1 }}
                              >
                                {busyId === t.id ? "Working..." : "Resolve"}
                              </button>
                            )}

                            <button
                              onClick={() => deleteTicket(t.id)}
                              disabled={busyId === t.id}
                              style={{ ...btn, borderColor: "#ef4444", color: "#b91c1c", opacity: busyId === t.id ? 0.7 : 1 }}
                            >
                              {busyId === t.id ? "Working..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          © {new Date().getFullYear()} {COMPANY} — Internal Use Only
        </div>
      </div>
    </div>
  );
}


