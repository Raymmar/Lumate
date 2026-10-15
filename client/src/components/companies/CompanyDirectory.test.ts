import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Exercise the real directory, grid, and year dialogs. Replace network/hooks and
// presentation primitives only; no server startup, database writes, or mail jobs.
const mocks: Record<string, string> = {
  react: `export const useState = harness.useState; export const useEffect = () => {};
    export const useMemo = (fn) => fn();`,
  "@tanstack/react-query": `export const useQuery = harness.useQuery; export const useMutation = harness.useMutation;`,
  wouter: `export const useLocation = () => ["/companies", () => {}]; export const Link = harness.ui("Link");`,
  "@/hooks/use-summits": `export const useCurrentSummit = () => {
    harness.summitReads++; return { data: {year: 2027}, isLoading: false };
  }; export const useSummits = () => ({data: [2025, 2026, 2027].map(year => ({id: year, year}))});`,
  "@/components/layout/DashboardLayout": `export default harness.ui("DashboardLayout");`,
  "@/components/layout/AdminLayout": `export const AdminLayout = harness.ui("AdminLayout");`,
  "@/components/speakers": `export const SpeakerGrid = ({speakers}) => speakers.map(s => s.name).join(", ");`,
  "@/components/ui/seo": `export const SEO = () => null;`,
  "@/hooks/use-toast": `export const useToast = () => ({toast: () => {}});`,
  "@/lib/queryClient": `export const apiRequest = harness.apiRequest;
    export const queryClient = {invalidateQueries: async (options) => harness.invalidations.push(options)};`,
  "@/lib/sponsorUtils": `export const generateSponsorInquiryEmail = () => "mailto:sponsors@example.test";`,
  "@/components/companies/CompanyCard": `export const CompanyCard = ({name}) => name;`,
  SponsorCard: `export const SponsorCard = (props) => {
    harness.cards.push(props); return props.sponsor.name;
  };`,
  SponsorModal: `export const SponsorModal = (props) => { harness.modals.push(props); return null; };`,
  SponsorPicker: `export const SponsorPicker = (props) => { harness.picker = props; return null; };`,
};
const uiExports = [
  "Input", "Badge", "Button", "Card", "CardContent", "CardHeader", "CardTitle", "Skeleton",
  "Dialog", "DialogContent", "DialogDescription", "DialogFooter", "DialogHeader", "DialogTitle",
  "Label", "Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue",
  "Tabs", "TabsContent", "TabsList", "TabsTrigger",
  "Table", "TableBody", "TableCell", "TableHead", "TableHeader", "TableRow",
  "DropdownMenu", "DropdownMenuContent", "DropdownMenuItem", "DropdownMenuTrigger",
];
const bundle = await build({
  stdin: {
    contents: `
      export {default as CompanyDirectory} from "./client/src/components/companies/CompanyDirectory";
      export {SponsorGrid} from "./client/src/components/sponsors/SponsorGrid";
      export {SingleSponsor} from "./client/src/components/sponsors/SingleSponsor";
      export {default as SpeakersPage} from "./client/src/pages/SpeakersPage";
      export {default as AdminSponsorsPage} from "./client/src/pages/admin/AdminSponsorsPage";
      export {SummitSpeakersSection} from "./client/src/components/summit/SummitSpeakersSection";
      export {invalidateSponsorQueries} from "./client/src/components/sponsors/sponsorApi";
    `,
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic",
  packages: "external", write: false,
  plugins: [{
    name: "directory-fixtures",
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => {
        const basename = path.split("/").at(-1)!;
        if (mocks[path]) return { path, namespace: "fixture" };
        if (mocks[basename]) return { path: basename, namespace: "fixture" };
        if (path.startsWith("@/components/ui/")) return { path: "ui", namespace: "fixture" };
        // Avoid the sponsors barrel pulling unrelated consumers into this test.
        if (path === "@/components/sponsors") return {
          path: `${process.cwd()}/client/src/components/sponsors/SponsorGrid.tsx`,
        };
      });
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
        contents: path === "ui"
          ? uiExports.map(name => `export const ${name} = harness.ui("${name}");`).join("\n")
          : mocks[path],
        loader: "js",
      }));
    },
  }],
});

const sponsors = [
  { id: 1, name: "Calendar Sponsor", year: 2026, tier: "Seed", sponsorshipId: 101, companyId: 11 },
  { id: 1, name: "Calendar Sponsor", year: 2027, tier: "Angel", sponsorshipId: 201, companyId: 11 },
  { id: 2, name: "Early Next Year Sponsor", year: 2027, tier: "Series A", sponsorshipId: 202, companyId: 12 },
];

function fixture(date = new Date(2026, 9, 15), admin = false, rows = sponsors, linkedCompanies = true) {
  let state: any[] = [];
  let cursor = 0;
  const harness = {
    queries: [] as any[], cards: [] as any[], modals: [] as any[],
    forms: new Set<any>(), controls: new Map<string, any>(), selects: [] as any[],
    inputs: [] as any[],
    invalidations: [] as any[], requests: [] as any[], writes: [] as any[],
    summitReads: 0, picker: null as any,
    useState(initial: any) {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = typeof initial === "function" ? initial() : initial;
      return [state[slot], (value: any) => { state[slot] = value; }];
    },
    useQuery(options: any) {
      harness.queries.push(options);
      const key = options.queryKey[0];
      if (key === "/api/auth/me") return { data: { isAdmin: admin } };
      if (key === "/api/speakers") {
        const all = [
          { id: 1, name: "Earlier Speaker", summits: [{ year: 2025 }] },
          { id: 2, name: "Previous Summit Speaker", summits: [{ year: 2026 }] },
        ];
        const year = options.queryKey[1]?.year;
        return { data: { speakers: year ? all.filter(s => s.summits.some(event => String(event.year) === year)) : all } };
      }
      if (key === "/api/sponsors/all") {
        const currentYear = options.queryKey[1];
        const ids = [...new Set(rows.map(s => s.id))];
        return { data: { currentYear, sponsors: ids.map(id => ({
          ...rows.find(s => s.id === id),
          sponsorships: rows.filter(s => s.id === id).map(s => ({ id: s.sponsorshipId, year: s.year, tier: s.tier })),
          isActive: rows.some(s => s.id === id && s.year === currentYear),
        })) } };
      }
      if (/^\/api\/sponsors\/\d+\?/.test(key)) {
        const url = new URL(key, "https://example.test");
        const id = Number(url.pathname.split("/").at(-1));
        const year = Number(url.searchParams.get("year"));
        return { data: { sponsor: rows.find(s => s.id === id && s.year === year) } };
      }
      if (key === "/api/companies") return {
        data: {
          companies: linkedCompanies ? [{ id: 11, name: "Calendar Company" }] : [],
          filters: { sponsors: { count: linkedCompanies ? 1 : 0, tiers: [] },
            industries: [{ name: "", count: 2 }, { name: "Technology", count: 1 }] },
        },
      };
      if (key.startsWith("/api/sponsors?")) {
        const year = Number(new URL(key, "https://example.test").searchParams.get("year"));
        return { data: { sponsors: rows.filter(s => s.year === year) } };
      }
      throw new Error(`Unexpected query: ${key}`);
    },
    useMutation(options: any) {
      return { mutate: (value: any) => options.mutationFn(value), isPending: false };
    },
    apiRequest: async (url: string, method: string, body: unknown) => {
      harness.writes.push({ url, method, body });
    },
    ui(name: string) {
      return (props: any) => {
        const inspect = (node: any) => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) return node.forEach(inspect);
          if (node.type === "form") harness.forms.add(node.props);
          inspect(node.props?.children);
        };
        inspect(props.children);
        const id = props["data-testid"];
        if (id) harness.controls.set(id, props);
        if (name === "Select") harness.selects.push(props);
        if (name === "Input") harness.inputs.push(props);
        return createElement("div", id ? { "data-testid": id } : {}, name === "AdminLayout" ? props.title : null, props.children);
      };
    },
  };
  class Clock extends Date {
    constructor() { super(date.getTime()); }
  }
  const loaded = { exports: {} as any };
  new Function("require", "module", "exports", "harness", "Date", "fetch", "window", bundle.outputFiles[0].text)(
    createRequire(import.meta.url), loaded, loaded.exports, harness, Clock,
    async (url: string) => { harness.requests.push(url); return Response.json({ companies: [], filters: {} }); },
    { confirm: () => true, location: { pathname: "/companies", search: "" } },
  );
  function render(component = loaded.exports.CompanyDirectory, props = {}) {
    cursor = 0;
    harness.queries = [];
    harness.cards = [];
    harness.forms.clear();
    harness.controls.clear();
    harness.selects = [];
    harness.inputs = [];
    return renderToStaticMarkup(createElement(component, props));
  }
  return { harness, render, ...loaded.exports };
}

test("2026 directory ignores a live 2027 summit, with or without early 2027 sponsors", async () => {
  for (const rows of [sponsors.filter(s => s.year === 2026), sponsors]) {
    const { harness, render } = fixture(undefined, false, rows);
    const html = render();
    assert.match(html, /2026 Annual Sponsors/);
    assert.match(html, /Calendar Sponsor/);
    assert.doesNotMatch(html, /Early Next Year Sponsor|2027 Annual Sponsors/);
    assert.equal(harness.cards[0].sponsor.tier, "Seed");
    assert.equal(harness.queries.some(q => q.queryKey[0] === "/api/sponsors?year=2027"), false);
    assert.equal(harness.summitReads, 0);
    const query = harness.queries.find(q => q.queryKey[0] === "/api/companies");
    assert.deepEqual(query.queryKey, ["/api/companies", "sponsors", 2026]);
    await query.queryFn();
    assert.equal(new URL(harness.requests[0], "https://example.test").searchParams.get("year"), "2026");
  }
});

test("every directory filter scopes counts and cache identity to the calendar year", async () => {
  const { harness, render } = fixture();
  render();
  for (const [id, filter] of [
    ["filter-industry-technology", "Technology"], ["filter-all", ""], ["filter-sponsors", "sponsors"],
  ]) {
    harness.controls.get(id).onClick();
    render();
    const query = harness.queries.find(q => q.queryKey[0] === "/api/companies");
    assert.deepEqual(query.queryKey, ["/api/companies", filter, 2026]);
    await query.queryFn();
    const params = new URL(harness.requests.at(-1), "https://example.test").searchParams;
    assert.equal(params.get("year"), "2026");
    assert.equal(params.get("filter") ?? "", filter);
  }
});

test("December 31 and January 1 visits change the heading, sponsors, and cache year together", () => {
  for (const [date, year] of [
    [new Date("2026-12-31T23:59:59-05:00"), 2026],
    [new Date("2027-01-01T00:00:00-05:00"), 2027],
  ] as const) {
    const { harness, render } = fixture(date);
    const html = render();
    assert.match(html, new RegExp(`${year} Annual Sponsors`));
    assert.deepEqual(harness.cards.map(c => c.sponsor.sponsorshipId), year === 2026 ? [101] : [202, 201]);
    assert.deepEqual(harness.queries[0].queryKey, ["/api/companies", "sponsors", year]);
  }
});

test("unlinked sponsors and empty new years do not hide the grid or admin add controls", () => {
  const unlinked = fixture(undefined, false, sponsors, false);
  assert.match(unlinked.render(), /Calendar Sponsor/);
  const empty = fixture(new Date("2027-01-01T00:00:00-05:00"), true, sponsors.filter(s => s.year === 2026), false);
  const html = empty.render();
  assert.match(html, /2027 Annual Sponsors/);
  assert.match(html, /Add Sponsor/);
  assert.doesNotMatch(html, /Calendar Sponsor|No companies found/);
});

test("directory admin adds, changes tier, and removes only the displayed year's sponsorship", async () => {
  const { harness, render } = fixture(undefined, true);
  render();
  harness.controls.get("button-add-sponsor").onClick();
  assert.match(render(), /Add sponsor to 2026/);
  harness.picker.onChange({ id: 3, sponsorships: [] });
  render();
  const addForm = [...harness.forms][0];
  addForm.onSubmit({ preventDefault() {} });
  assert.deepEqual(harness.writes[0], {
    url: "/api/sponsorships", method: "POST", body: { sponsorId: 3, year: 2026, tier: "Series A" },
  });
  const card = harness.cards[0];
  assert.equal(card.removeLabel, "Remove from 2026");
  card.onChangeTier(card.sponsor);
  assert.match(render(), /Calendar Sponsor&#x27;s tier for 2026 only/);
  harness.selects.at(-1).onValueChange("Angel");
  render();
  const tierForm = [...harness.forms].at(-1)!;
  tierForm.onSubmit({ preventDefault() {} });
  assert.deepEqual(harness.writes[1], {
    url: "/api/sponsorships/101", method: "PATCH", body: { tier: "Angel" },
  });
  card.onRemove(card.sponsor);
  assert.deepEqual(harness.writes[2], { url: "/api/sponsorships/101", method: "DELETE", body: undefined });
});

test("creating a new sponsor from the directory also uses the displayed year", () => {
  const { harness, render } = fixture(undefined, true, []);
  render();
  harness.controls.get("button-add-sponsor-Seed").onClick();
  render();
  harness.picker.onCreateNew("New Directory Sponsor");
  render();
  assert.equal(harness.modals.at(-1).year, 2026);
  assert.equal(harness.modals.at(-1).defaultTier, "Seed");
});

test("general grids use calendar year; explicitly dated summit grids retain their year", () => {
  for (const year of [2025, 2026, 2027, undefined]) {
    const { harness, render, SponsorGrid } = fixture();
    render(SponsorGrid, { year });
    assert.equal(harness.queries.some(q => q.queryKey[0] === `/api/sponsors?year=${year ?? 2026}`), true);
    assert.equal(harness.summitReads, 0);
  }
});

test("individual sponsor cards use that annual year's tier and never show future-only sponsors early", () => {
  for (const [props, tier] of [
    [{ sponsorId: 1 }, "Seed"],
    [{ sponsorId: 1, year: 2027 }, "Angel"],
    [{ sponsorId: 2 }, null],
  ] as const) {
    const { harness, render, SingleSponsor } = fixture();
    render(SingleSponsor, props);
    assert.equal(harness.cards[0]?.sponsor.tier ?? null, tier);
  }
});

test("speakers start with all years, allow optional year/search filters, and recover from an empty upcoming year", async () => {
  const { harness, render, SpeakersPage } = fixture();
  const html = render(SpeakersPage);
  assert.match(html, /Earlier Speaker, Previous Summit Speaker/);
  assert.equal(harness.selects[0].value, "all");
  assert.equal(harness.summitReads, 0);
  const allQuery = harness.queries.find(q => q.queryKey[0] === "/api/speakers");
  assert.deepEqual(allQuery.queryKey, ["/api/speakers"]);
  assert.notEqual(allQuery.enabled, false);
  await allQuery.queryFn();
  assert.equal(harness.requests.at(-1), "/api/speakers");

  harness.inputs.find(p => p.placeholder === "Search speakers...").onChange({ target: { value: "Earlier" } });
  assert.doesNotMatch(render(SpeakersPage), /Previous Summit Speaker/);
  harness.inputs.find(p => p.placeholder === "Search speakers...").onChange({ target: { value: "" } });
  render(SpeakersPage);
  for (const year of ["2026", "2027", "all"]) {
    harness.selects[0].onValueChange(year);
    const result = render(SpeakersPage);
    const query = harness.queries.find(q => q.queryKey[0] === "/api/speakers");
    await query.queryFn();
    assert.equal(harness.requests.at(-1), year === "all" ? "/api/speakers" : `/api/speakers?year=${year}`);
    assert.equal(harness.selects[0].value, year);
    if (year === "2026") {
      assert.match(result, /Previous Summit Speaker/);
      assert.doesNotMatch(result, /Earlier Speaker/);
    } else if (year === "2027") {
      assert.match(result, /No speakers for the 2027 summit yet/);
    } else {
      assert.match(result, /Earlier Speaker, Previous Summit Speaker/);
    }
  }
});

test("dated summit speaker sections always query their explicit year", async () => {
  for (const year of [2025, 2026, 2027]) {
    const { harness, render, SummitSpeakersSection } = fixture();
    const html = render(SummitSpeakersSection, { year });
    const query = harness.queries[0];
    assert.deepEqual(query.queryKey, ["/api/speakers", { year: String(year) }]);
    await query.queryFn();
    assert.equal(harness.requests[0], `/api/speakers?year=${year}`);
    if (year === 2027) assert.equal(html, "");
  }
});

test("sponsor administration defaults to calendar year but supports preparing the next year", () => {
  const { harness, render, AdminSponsorsPage } = fixture(undefined, true, [
    ...sponsors, { id: 3, name: "Past Sponsor", year: 2025, tier: "Seed", sponsorshipId: 50, companyId: 13 },
  ]);
  let html = render(AdminSponsorsPage);
  assert.match(html, /2026 Sponsors/);
  assert.match(html, /data-testid="status-active-1"/);
  assert.match(html, /data-testid="status-upcoming-2"/);
  assert.match(html, /data-testid="status-past-3"/);
  assert.equal(harness.summitReads, 0);
  harness.selects[0].onValueChange("2027");
  html = render(AdminSponsorsPage);
  assert.match(html, /2027 Sponsors/);
  assert.ok(harness.queries.some(q => q.queryKey[0] === "/api/sponsors?year=2027"));
});

test("sponsor changes invalidate directory counts as well as sponsor and summit queries", async () => {
  const { harness, invalidateSponsorQueries } = fixture();
  await invalidateSponsorQueries();
  assert.ok(harness.invalidations.some(q => q.queryKey?.[0] === "/api/companies"));
  assert.ok(harness.invalidations.some(q => q.queryKey?.[0] === "/api/summits"));
  const predicate = harness.invalidations.find(q => q.predicate).predicate;
  assert.equal(predicate({ queryKey: ["/api/sponsors?year=2026"] }), true);
  assert.equal(predicate({ queryKey: ["/api/sponsors?year=2027"] }), true);
});
