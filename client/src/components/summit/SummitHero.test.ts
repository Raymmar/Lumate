import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { insertSummitSchema } from "../../../../shared/schema";

const bundle = await build({
  stdin: {
    contents: 'export { SummitHero } from "./client/src/components/summit/SummitHero"; export { Router } from "wouter";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  packages: "external",
  write: false,
});
const loaded = { exports: {} as any };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url), loaded, loaded.exports,
);
const { SummitHero } = loaded.exports;
function renderHero(props: Record<string, unknown>) {
  return renderToStaticMarkup(createElement(
    loaded.exports.Router, { ssrPath: "/summit" }, createElement(SummitHero, props),
  ));
}
const summit = {
  year: 2027,
  title: "Sarasota Tech Summit",
  ticketUrl: "https://example.test/tickets",
};

test("summit create and edit validation preserves both toggle values", () => {
  for (const showLearnMore of [true, false]) {
    assert.equal(insertSummitSchema.parse({ ...summit, showLearnMore }).showLearnMore, showLearnMore);
    assert.equal(insertSummitSchema.partial().parse({ showLearnMore }).showLearnMore, showLearnMore);
  }
  assert.equal(insertSummitSchema.partial().parse({ title: "Updated title" }).showLearnMore, undefined);
  assert.equal(insertSummitSchema.safeParse({ ...summit, showLearnMore: "false" }).success, false);
});

test("enabled Learn more links to the matching annual page", () => {
  const html = renderHero({ summit, isPast: false, showLearnMore: true });
  assert.match(html, /Learn more/);
  assert.match(html, /href="\/summit\/2027"/);
  assert.match(html, /Get Tickets/);
});

test("disabled Learn more leaves ticket access unchanged", () => {
  const html = renderHero({ summit, isPast: false, showLearnMore: false });
  assert.doesNotMatch(html, /Learn more/);
  assert.match(html, /href="https:\/\/example.test\/tickets"/);
  assert.match(html, /Get Tickets/);
});

test("annual pages do not show a self-link by default", () => {
  const html = renderHero({ summit, isPast: false });
  assert.doesNotMatch(html, /Learn more/);
});

test("Learn more is available even when no ticket link is configured", () => {
  const html = renderHero({
    summit: { ...summit, ticketUrl: null }, isPast: false, showLearnMore: true,
  });
  assert.match(html, /Learn more/);
  assert.doesNotMatch(html, /Get Tickets/);
});
