import assert from "node:assert/strict";
import { test } from "node:test";
import { compareSessionSpeakers, moveSessionSpeaker, orderSummitSpeakers } from "./speakerOrder";

const speakers = [
  { id: 1, isModerator: false, displayOrder: 0 },
  { id: 2, isModerator: false, displayOrder: 0 },
  { id: 3, isModerator: false, displayOrder: 9 },
  { id: 4, isModerator: true, displayOrder: 12 },
  { id: 5, isModerator: true, displayOrder: 13 },
];
const ids = (rows: { id: number }[] | null) => rows?.map(row => row.id);

test("session order puts moderators first with deterministic duplicate ranks", () => {
  assert.deepEqual(ids([...speakers].reverse().sort(compareSessionSpeakers)), [4, 5, 1, 2, 3]);
});

test("up and down persist a normalized order even with tied or gapped ranks", () => {
  const moved = moveSessionSpeaker(speakers, 2, -1)!;
  assert.deepEqual(ids(moved), [4, 5, 2, 1, 3]);
  assert.deepEqual(moved.map(speaker => speaker.displayOrder), [0, 1, 2, 3, 4]);
  assert.deepEqual(ids(moveSessionSpeaker(moved, 2, 1)), [4, 5, 1, 2, 3]);
  assert.deepEqual(speakers.map(speaker => speaker.displayOrder), [0, 0, 9, 12, 13]);
});

test("moderators can reorder without changing roles", () => {
  const moved = moveSessionSpeaker(speakers, 5, -1)!;
  assert.deepEqual(ids(moved), [5, 4, 1, 2, 3]);
  assert.ok(moved.slice(0, 2).every(speaker => speaker.isModerator));
});

test("boundaries, role crossings, missing speakers and empty lists do not move", () => {
  for (const [id, direction] of [[4, -1], [5, 1], [1, -1], [3, 1], [999, 1]] as const) {
    assert.equal(moveSessionSpeaker(speakers, id, direction), null);
  }
  assert.equal(moveSessionSpeaker([], 1, 1), null);
  assert.equal(moveSessionSpeaker([speakers[0]], 1, -1), null);
});

test("year lineup uses first session appearance, deduplicates and ignores other years", () => {
  const lineup = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const participation = [
    { speakerId: 1, year: 2027 },
    { speakerId: 3, year: 2026 },
    { speakerId: 2, year: 2026 },
    { speakerId: 3, year: 2026 },
    { speakerId: 1, year: 2026 },
  ];
  assert.deepEqual(ids(orderSummitSpeakers(lineup, participation, 2026)), [3, 2, 1]);
  assert.equal(orderSummitSpeakers(lineup, participation), lineup);
  assert.deepEqual(ids(lineup), [1, 2, 3]);
});
