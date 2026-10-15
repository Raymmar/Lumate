import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { canAutoAssignPresentation } from "../shared/agenda";

// Load the real route handler without starting the database, mailer, or other services.
const source = readFileSync("server/routes.ts", "utf8");
const ast = ts.createSourceFile("routes.ts", source, ts.ScriptTarget.Latest, true);
let handlerSource = "";
function findHandler(node: ts.Node) {
  if (ts.isCallExpression(node)
    && node.expression.getText(ast) === "app.post"
    && node.arguments[0]?.getText(ast) === '"/api/admin/backfill-time-blocks"') {
    handlerSource = node.arguments[2].getText(ast);
  }
  ts.forEachChild(node, findHandler);
}
findHandler(ast);
assert.ok(handlerSource, "Backfill route must exist");
const handlerJs = ts.transpileModule(`(${handlerSource})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

type Scope = { summitId?: number };
function fixture(reuseBlock = false) {
  const startTime = "2026-01-01T10:00:00Z";
  const endTime = "2026-01-01T11:00:00Z";
  const presentations = [
    { id: 1, summitId: 10, timeBlockId: null as number | null, startTime, endTime },
    { id: 2, summitId: 20, timeBlockId: null as number | null, startTime, endTime },
    { id: 3, summitId: 10, timeBlockId: null as number | null, startTime: "bad", endTime },
    { id: 4, summitId: 10, timeBlockId: 5 as number | null, startTime, endTime },
  ];
  const blocks = [
    { id: 5, summitId: 20, startTime, endTime, displayOrder: 99 },
    ...(reuseBlock ? [{ id: 6, summitId: 10, startTime, endTime, displayOrder: 2 }] : []),
  ];
  const reads: Scope[] = [];
  const writes: number[] = [];
  const created: typeof blocks = [];
  const scoped = <T extends { summitId: number }>(rows: T[], scope: Scope) => {
    reads.push(scope);
    return rows.filter(row => scope.summitId === undefined || row.summitId === scope.summitId);
  };
  const storage = {
    getPresentations: async (scope: Scope) => scoped(presentations, scope),
    getTimeBlocks: async (scope: Scope) => scoped(blocks, scope),
    createTimeBlock: async (data: Omit<(typeof blocks)[number], "id">) => {
      const block = { ...data, id: 100 + created.length };
      created.push(block);
      blocks.push(block);
      return block;
    },
    updatePresentation: async (id: number, data: { timeBlockId: number }) => {
      writes.push(id);
      Object.assign(presentations.find(p => p.id === id)!, data);
    },
  };
  const handler = vm.runInNewContext(handlerJs, {
    storage, z, canAutoAssignPresentation, console: { log() {}, error: console.error },
  });
  async function request(body?: unknown) {
    let status = 200;
    let payload: any;
    const res = {
      status(code: number) { status = code; return this; },
      json(data: unknown) { payload = data; return this; },
    };
    await handler({ body }, res);
    return { status, payload };
  }
  return { presentations, reads, writes, created, request };
}

test("a summit request only reads and assigns that summit; count matches eligible sessions", async () => {
  const f = fixture();
  const expected = f.presentations.filter(p => p.summitId === 10).filter(canAutoAssignPresentation).length;
  const { status, payload } = await f.request({ summitId: 10 });
  assert.equal(status, 200);
  assert.equal(payload.assignedPresentations, expected);
  assert.equal(payload.skippedPresentations, 1);
  assert.deepEqual(f.writes, [1]);
  assert.ok(f.reads.every(scope => scope.summitId === 10));
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].summitId, 10);
  assert.equal(f.created[0].displayOrder, 1, "other summit orders must not affect this summit");
  assert.equal(f.presentations[1].timeBlockId, null);
});

test("a scoped request reuses an existing block from its own summit", async () => {
  const f = fixture(true);
  const { payload } = await f.request({ summitId: 10 });
  assert.equal(payload.createdBlocks, 0);
  assert.equal(payload.assignedPresentations, 1);
  assert.equal(f.presentations[0].timeBlockId, 6);
});

test("omitting the summit preserves assignment across all summits", async () => {
  for (const body of [undefined, {}]) {
    const f = fixture();
    const { payload } = await f.request(body);
    assert.equal(payload.assignedPresentations, 2);
    assert.deepEqual(f.writes, [1, 2]);
    assert.ok(f.reads.every(scope => scope.summitId === undefined));
    assert.equal(f.presentations[1].timeBlockId, 5);
  }
});

test("invalid summit IDs fail before any storage reads or writes", async () => {
  for (const summitId of [null, "10", 0, -1, 1.5, [], {}]) {
    const f = fixture();
    const { status } = await f.request({ summitId });
    assert.equal(status, 400);
    assert.equal(f.reads.length, 0);
    assert.equal(f.writes.length, 0);
  }
});

test("a summit with no sessions changes nothing", async () => {
  const f = fixture();
  const { payload } = await f.request({ summitId: 999 });
  assert.equal(payload.assignedPresentations, 0);
  assert.equal(payload.createdBlocks, 0);
  assert.equal(f.writes.length, 0);
});

test("eligibility excludes assigned sessions and missing or invalid dates", () => {
  const valid = { startTime: "2026-01-01T10:00:00Z", endTime: "2026-01-01T11:00:00Z" };
  assert.equal(canAutoAssignPresentation(valid), true);
  for (const overrides of [{ timeBlockId: 1 }, { startTime: null }, { endTime: "" }, { endTime: "invalid" }]) {
    assert.equal(canAutoAssignPresentation({ ...valid, ...overrides }), false);
  }
});

test("the agenda mutation sends the selected summit, or no body for an unscoped agenda", async () => {
  const clientSource = readFileSync("client/src/components/agenda/AgendaSection.tsx", "utf8");
  const clientAst = ts.createSourceFile("AgendaSection.tsx", clientSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let mutationSource = "";
  function findMutation(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(clientAst) === "backfillMutation") {
      const call = node.initializer as ts.CallExpression;
      const options = call.arguments[0] as ts.ObjectLiteralExpression;
      const property = options.properties.find(p => p.name?.getText(clientAst) === "mutationFn") as ts.PropertyAssignment;
      mutationSource = property.initializer.getText(clientAst);
    }
    ts.forEachChild(node, findMutation);
  }
  findMutation(clientAst);
  assert.ok(mutationSource);
  const js = ts.transpileModule(`(${mutationSource})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const { summitId, summitYear } of [
    { summitId: 10, summitYear: 2026 },
    { summitId: 20, summitYear: 2027 },
    { summitId: undefined, summitYear: undefined },
    { summitId: undefined, summitYear: 2026 },
  ]) {
    const calls: unknown[][] = [];
    const mutation = vm.runInNewContext(js, {
      summitId, summitYear,
      apiRequest: async (...args: unknown[]) => { calls.push(args); return {}; },
    });
    if (summitYear !== undefined && summitId === undefined) {
      await assert.rejects(mutation(), /summit must be loaded/);
      assert.equal(calls.length, 0, "year-filtered agendas must never send an unscoped request");
      continue;
    }
    await mutation();
    assert.equal(calls[0][0], "/api/admin/backfill-time-blocks");
    assert.equal(calls[0][1], "POST");
    assert.equal(JSON.stringify(calls[0][2]), summitId === undefined ? undefined : JSON.stringify({ summitId }));
  }
});

test("every year-filtered agenda entry point supplies its summit ID", () => {
  for (const path of [
    "client/src/pages/SummitYearPage.tsx",
    "client/src/pages/admin/AdminAgendaPage.tsx",
    "client/src/pages/legacy/LegacySummit2026Page.tsx",
  ]) {
    const text = readFileSync(path, "utf8");
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let checked = 0;
    function check(node: ts.Node) {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
        && node.tagName.getText(file) === "AgendaSection") {
        const attributes = node.attributes.properties.map(p => p.name?.getText(file));
        if (attributes.includes("summitYear")) {
          assert.ok(attributes.includes("summitId"), `${path} must pass summitId for its year-filtered agenda`);
          checked++;
        }
      }
      ts.forEachChild(node, check);
    }
    check(file);
    assert.ok(checked, `${path} should contain a year-filtered agenda`);
  }
});
