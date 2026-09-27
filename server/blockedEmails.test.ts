import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { blockedEmailAddresses, isBlockedEmail } from "./blockedEmails";

// Execute the portable SELECTs against isolated fixtures, never application data.
test("primary and linked identities are suppressed case-insensitively across audiences and attendance", () => {
  const dialect = new PgDialect();
  const queries = [
    blockedEmailAddresses(),
    ...["PRIMARY@example.com", "ALT@example.com", "second@example.com", "active@example.com", "unknown@example.com"]
      .map(email => sql`SELECT ${isBlockedEmail(email)}`),
    sql`SELECT user_email FROM attendance WHERE NOT ${isBlockedEmail(sql`attendance.user_email`)} ORDER BY user_email`,
    sql`SELECT count(*) FROM attendance WHERE NOT ${isBlockedEmail(sql`attendance.user_email`)}`,
  ].map(query => dialect.sqlToQuery(query));
  const result = JSON.parse(execFileSync("python3", ["-c", `
import sqlite3, json, sys
db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE users (id INTEGER, email TEXT, blocked_at TEXT);
CREATE TABLE people (id INTEGER, email TEXT);
CREATE TABLE user_people_links (user_id INTEGER, person_id INTEGER);
CREATE TABLE attendance (user_email TEXT);
INSERT INTO users VALUES (1,'primary@example.com','2026-01-01'),(2,'active@example.com',NULL),(3,'alt@example.com',NULL);
INSERT INTO people VALUES (10,'Alt@Example.com'),(11,'second@example.com'),(12,'allowed@example.com');
INSERT INTO user_people_links VALUES (1,10),(1,11),(1,10),(2,12),(2,10);
INSERT INTO attendance VALUES ('PRIMARY@example.com'),('ALT@example.com'),('second@example.com'),('allowed@example.com'),('unknown@example.com');
""")
queries = json.load(sys.stdin)
before = [db.execute(q["sql"], q["params"]).fetchall() for q in queries]
db.execute("UPDATE users SET blocked_at = NULL WHERE id = 1")
after = db.execute(queries[0]["sql"]).fetchall()
print(json.dumps({"before": before, "after": after}))
`], { input: JSON.stringify(queries), encoding: "utf8" }));
  assert.deepEqual(result.before[0], [["alt@example.com"], ["primary@example.com"], ["second@example.com"]]);
  assert.deepEqual(result.before.slice(1, 6), [[[1]], [[1]], [[1]], [[0]], [[0]]]);
  assert.deepEqual(result.before[6], [["allowed@example.com"], ["unknown@example.com"]]);
  assert.deepEqual(result.before[7], [[2]]);
  assert.deepEqual(result.after, []);
});

test("both attendee queries and newsletter filtering use the shared suppression policy", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.equal(routes.match(/NOT \$\{isBlockedEmail\(sql`\$\{attendance.userEmail\}`\)\}/g)?.length, 4);
  assert.match(routes, /db\.execute\(blockedEmailAddresses\(\)\)/);
  const email = readFileSync(new URL("./email.ts", import.meta.url), "utf8");
  assert.match(email, /SELECT \$\{isBlockedEmail\(email\)\} AS blocked/);
  assert.match(email, /catch \(error\) \{[\s\S]*?canSendTo check failed[\s\S]*?return false/);
});

// Load the actual route registration in isolation, without starting background
// services or sending email. TypeScript's parser preserves the complete handler.
function loadRoute(path: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const file = ts.createSourceFile("routes.ts", source, ts.ScriptTarget.Latest, true);
  let registration = "";
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === "app.get" &&
        node.arguments[0]?.getText(file) === JSON.stringify(path)) {
      registration = node.getText(file);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(registration, `Route exists: ${path}`);
  let handlers: any[] = [];
  vm.runInNewContext(ts.transpileModule(registration, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    console, ...dependencies,
    app: { get: (_path: string, ...registered: any[]) => { handlers = registered; } },
  });
  return handlers;
}

test("direct linked profiles, username fallbacks, stats and events return 404 before disclosing data", async () => {
  for (const path of ["/api/people/:id", "/api/people/by-username/:username", "/api/people/:id/stats", "/api/people/:id/events"]) {
    for (const fallback of [false, true]) {
      const person = { email: "ALT@example.com", userName: "alternate" };
      const handlers = loadRoute(path, {
        storage: {
          getUserBySlug: async () => null,
          getPersonByApiId: async () => person,
          getPersonByUsername: async () => fallback ? null : person,
        },
        hasBlockedEmail: async (email: string) => email.toLowerCase() === "alt@example.com",
      });
      let status = 200;
      let body: any;
      const res = {
        status(code: number) { status = code; return this; },
        json(value: unknown) { body = value; },
        redirect() { assert.fail("Blocked profile must not redirect"); },
      };
      await handlers[0]({ params: { id: "alternate", username: "alternate" }, headers: { accept: "text/html" } }, res);
      assert.equal(status, 404, path);
      assert.ok(body.error);
      assert.equal(body.email, undefined);
    }
  }
});

test("admin attendee endpoint requires admin access and filters both list and total", async () => {
  const requireAdmin = () => {};
  const predicates: string[] = [];
  const chain: any = {
    select: () => chain, from: () => chain, innerJoin: () => chain,
    where: (query: any) => { predicates.push(new PgDialect().sqlToQuery(query).sql); return chain; },
    orderBy: () => chain,
    then: (resolve: any) => resolve([]),
  };
  const handlers = loadRoute("/api/admin/events/:eventId/attendees", {
    requireAdmin, db: chain, sql, isBlockedEmail,
    eq: (a: any, b: any) => sql`${a} = ${b}`,
    and: (...conditions: any[]) => sql.join(conditions, sql` AND `),
    attendance: { eventApiId: sql`event_api_id`, userEmail: sql`user_email`, personId: sql`person_id` },
    people: { id: sql`id` },
  });
  assert.equal(handlers[0], requireAdmin);
  let response: any;
  await handlers[1]({ params: { eventId: "fixture" } }, { json: (body: any) => { response = body; } });
  assert.equal(predicates.length, 2);
  for (const predicate of predicates) {
    assert.match(predicate, /NOT EXISTS/);
    assert.match(predicate, /user_people_links/);
  }
  assert.equal(response.total, 0);
  assert.equal(response.attendees.length, 0);
});