import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { eq, or, sql, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { coupons } from "../shared/schema";

// Exercise the real storage method without importing db.ts or starting services.
const source = readFileSync("server/storage.ts", "utf8");
const ast = ts.createSourceFile("storage.ts", source, ts.ScriptTarget.Latest, true);
const storageClass = ast.statements.find(
  (node): node is ts.ClassDeclaration =>
    ts.isClassDeclaration(node) && node.name?.text === "PostgresStorage",
);
const method = storageClass?.members.find(
  (node): node is ts.MethodDeclaration =>
    ts.isMethodDeclaration(node) && node.name.getText(ast) === "getCouponsByUser",
);
assert.ok(method, "getCouponsByUser must exist");
const methodJs = ts.transpileModule(`({ ${method.getText(ast)} })`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

type Row = {
  id: number;
  recipientUserId: number | null;
  recipientPersonId: number | null;
  recipientEmail: string | null;
  status: string;
};
const rows: Row[] = [
  { id: 1, recipientUserId: null, recipientPersonId: 10, recipientEmail: "Member@Example.COM", status: "issued" },
  { id: 2, recipientUserId: null, recipientPersonId: null, recipientEmail: "member@example.com", status: "issued" },
  { id: 3, recipientUserId: 42, recipientPersonId: null, recipientEmail: "old@example.com", status: "redeemed" },
  { id: 4, recipientUserId: 42, recipientPersonId: null, recipientEmail: null, status: "issued" },
  { id: 5, recipientUserId: 99, recipientPersonId: null, recipientEmail: "other@example.com", status: "issued" },
  { id: 6, recipientUserId: null, recipientPersonId: 99, recipientEmail: "not-member@example.com", status: "issued" },
  { id: 7, recipientUserId: null, recipientPersonId: null, recipientEmail: null, status: "issued" },
  { id: 8, recipientUserId: null, recipientPersonId: null, recipientEmail: "", status: "issued" },
];

function fixture() {
  const dialect = new PgDialect();
  let condition: SQL;
  let compiled: ReturnType<PgDialect["sqlToQuery"]>;
  const db = {
    select() {
      return {
        from(table: unknown) {
          assert.equal(table, coupons);
          return {
            where(value: SQL) {
              condition = value;
              compiled = dialect.sqlToQuery(condition);
              return {
                orderBy(order: SQL) {
                  assert.equal(dialect.sqlToQuery(order).sql, '"coupons"."created_at" DESC');
                  // Interpret only the exact SQL shape asserted here. Unexpected query
                  // changes fail rather than letting the fixture mask a regression.
                  const hasEmail = compiled.params.length === 2;
                  assert.equal(compiled.sql, hasEmail
                    ? '("coupons"."recipient_user_id" = $1 or lower("coupons"."recipient_email") = $2)'
                    : '"coupons"."recipient_user_id" = $1');
                  return Promise.resolve(rows.filter(row =>
                    row.recipientUserId === compiled.params[0] ||
                    (hasEmail && row.recipientEmail !== null &&
                      row.recipientEmail.toLowerCase() === compiled.params[1]),
                  ));
                },
              };
            },
          };
        },
      };
    },
  };
  const storage = vm.runInNewContext(methodJs, { db, coupons, eq, or, sql, console }) as {
    getCouponsByUser(userId: number, email: string): Promise<Row[]>;
  };
  return { storage, query: () => compiled };
}

for (const email of ["member@example.com", "MEMBER@EXAMPLE.COM", "MeMbEr@Example.Com", " member@example.com "]) {
  test(`finds person-only and email-linked coupons for ${JSON.stringify(email)}`, async () => {
    const f = fixture();
    const result = await f.storage.getCouponsByUser(42, email);
    assert.deepEqual(result.map(row => row.id), [1, 2, 3, 4]);
    assert.deepEqual(f.query().params, [42, "member@example.com"]);
  });
}

test("user ownership still matches when the email differs or is null, regardless of status", async () => {
  const f = fixture();
  const result = await f.storage.getCouponsByUser(42, "new@example.com");
  assert.deepEqual(result.map(row => row.id), [3, 4]);
});

test("unrelated user IDs and emails cannot return other recipients' coupons", async () => {
  const f = fixture();
  assert.deepEqual(await f.storage.getCouponsByUser(100, "stranger@example.com"), []);
});

for (const email of ["", "   "]) {
  test(`blank email ${JSON.stringify(email)} only uses recipient user ownership`, async () => {
    const f = fixture();
    const result = await f.storage.getCouponsByUser(42, email);
    assert.deepEqual(result.map(row => row.id), [3, 4]);
    assert.deepEqual(f.query().params, [42]);
  });
}

test("email special characters are bound as literal values, never SQL or wildcards", async () => {
  const f = fixture();
  const email = "%_' OR 1=1 --@example.com";
  assert.deepEqual(await f.storage.getCouponsByUser(100, email), []);
  assert.deepEqual(f.query().params, [100, email.toLowerCase()]);
  assert.ok(!f.query().sql.includes(email));
});
