// Имитация Supabase для e2e-тестов: Auth (GoTrue) + PostgREST для `events`.
// Без сети и без настоящего проекта. JWT подписаны ES256, JWKS отдаётся —
// поэтому getClaims() проверяет подпись так же, как с настоящим Supabase.
//
// Служебные эндпоинты: GET /__health, POST /__reset, GET /__log.
import crypto from "node:crypto";
import http from "node:http";

import { FIXTURE_EVENTS, MOCK_USER } from "./fixtures.mjs";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54329);
const KID = "mock-key-1";
const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "gray"];

const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "ES256", use: "sig", key_ops: ["verify"] };

const b64u = (value) => Buffer.from(value).toString("base64url");

function signJwt(payload) {
  const header = { alg: "ES256", kid: KID, typ: "JWT" };
  const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const signature = crypto.sign("sha256", Buffer.from(data), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${data}.${b64u(signature)}`;
}

const user = {
  id: MOCK_USER.id,
  aud: "authenticated",
  role: "authenticated",
  email: MOCK_USER.email,
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function session(ttl = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = signJwt({
    sub: MOCK_USER.id, email: MOCK_USER.email, role: "authenticated", aud: "authenticated",
    iat: now, exp: now + ttl, session_id: crypto.randomUUID(), aal: "aal1", is_anonymous: false,
  });
  return {
    access_token, token_type: "bearer", expires_in: ttl, expires_at: now + ttl,
    refresh_token: crypto.randomBytes(12).toString("hex"), user,
  };
}

// ---------- состояние ----------
let events;
let nextId;
let log;
function reset() {
  events = FIXTURE_EVENTS.map((e) => ({
    user_id: MOCK_USER.id, timezone: "Europe/Moscow", reminder_enabled: false,
    reminder_minutes_before: null, jarvis_comment: null, ...e,
  }));
  nextId = 1;
  log = [];
}
reset();

// ---------- HTTP ----------
function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

const hasUserJwt = (req) => (req.headers.authorization ?? "").startsWith("Bearer ey");

/** Фильтры PostgREST вида column=op.value (gte, lte, eq). */
function applyFilters(rows, url) {
  for (const [column, filter] of url.searchParams) {
    if (["select", "order", "limit", "offset"].includes(column)) continue;
    const dot = filter.indexOf(".");
    const op = filter.slice(0, dot);
    const value = filter.slice(dot + 1);
    rows = rows.filter((r) => {
      const v = r[column];
      if (op === "eq") return String(v) === value;
      if (op === "gte") return v >= value;
      if (op === "lte") return v <= value;
      return true;
    });
  }
  return rows;
}

function project(rows, url) {
  const select = (url.searchParams.get("select") ?? "*").split(",").map((c) => c.trim());
  if (select[0] === "*") return rows;
  return rows.map((r) => Object.fromEntries(select.map((c) => [c, r[c] ?? null])));
}

function listEvents(req, url, res) {
  if (!hasUserJwt(req)) return send(res, 401, { message: "JWT required" });
  const rows = [...applyFilters(events, url)].sort(
    (a, b) =>
      a.event_date.localeCompare(b.event_date) ||
      Number(b.all_day) - Number(a.all_day) ||
      (a.start_time ?? "").localeCompare(b.start_time ?? ""),
  );
  return send(res, 200, project(rows, url));
}

/** Те же CHECK-ограничения, что в supabase/migrations/0001_init.sql. */
function violatedConstraint(row) {
  if (!/\S/.test(row.title ?? "")) return "events_title_not_blank";
  if (!COLORS.includes(row.color)) return "events_color_valid";
  const shapeOk =
    (row.all_day && row.start_time == null && row.end_time == null) ||
    (!row.all_day && row.start_time != null);
  if (!shapeOk) return "events_time_shape";
  if (row.end_time != null && row.end_time === row.start_time) return "events_end_not_equal_start";
  if (row.reminder_minutes_before != null && row.reminder_minutes_before < 0) return "events_reminder_minutes_nonneg";
  if (row.reminder_enabled && row.reminder_minutes_before == null) return "events_reminder_minutes_required";
  return null;
}

const toPgTime = (t) => (t == null ? null : t.length === 5 ? `${t}:00` : t);

function insertEvent(req, body, url, res) {
  if (!hasUserJwt(req)) return send(res, 401, { message: "JWT required" });
  const input = Array.isArray(body) ? body[0] : body;
  if ("user_id" in input) return send(res, 400, { message: "client must not send user_id" });
  const row = {
    id: `ev-${nextId++}`, user_id: MOCK_USER.id, timezone: "Europe/Moscow", color: "blue", all_day: false,
    start_time: null, end_time: null, reminder_enabled: false, reminder_minutes_before: null, jarvis_comment: null,
    ...input,
  };
  row.start_time = toPgTime(row.start_time);
  row.end_time = toPgTime(row.end_time);
  const constraint = violatedConstraint(row);
  if (constraint) {
    return send(res, 400, {
      code: "23514",
      message: `new row for relation "events" violates check constraint "${constraint}"`,
    });
  }
  events.push(row);
  log.push({ op: "insert", table: "events", row });
  return send(res, 201, project([row], url)[0]);
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};

    if (url.pathname === "/__health") return send(res, 200, { ok: true });
    if (url.pathname === "/__reset" && req.method === "POST") {
      reset();
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/__log") return send(res, 200, log);

    if (url.pathname === "/auth/v1/.well-known/jwks.json") return send(res, 200, { keys: [jwk] });
    if (url.pathname === "/auth/v1/token") {
      const grant = url.searchParams.get("grant_type");
      if (grant === "password") {
        if (body.email === MOCK_USER.email && body.password === MOCK_USER.password) {
          return send(res, 200, session());
        }
        return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      if (grant === "refresh_token") return send(res, 200, session());
    }
    if (url.pathname === "/auth/v1/logout") return send(res, 204);
    if (url.pathname === "/auth/v1/user") return send(res, 200, user);

    if (url.pathname === "/rest/v1/events" && req.method === "GET") return listEvents(req, url, res);
    if (url.pathname === "/rest/v1/events" && req.method === "POST") return insertEvent(req, body, url, res);

    send(res, 404, { message: `not mocked: ${req.method} ${url.pathname}` });
  })
  .listen(PORT, () => console.log(`[mock-supabase] http://localhost:${PORT}`));
