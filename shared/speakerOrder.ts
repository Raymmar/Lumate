type OrderedSessionSpeaker = {
  id: number;
  isModerator: boolean;
  displayOrder: number;
};

export function compareSessionSpeakers(a: OrderedSessionSpeaker, b: OrderedSessionSpeaker): number {
  return Number(b.isModerator) - Number(a.isModerator) || a.displayOrder - b.displayOrder || a.id - b.id;
}

/** Moves within a role group and normalizes ranks, including legacy duplicate/gapped ranks. */
export function moveSessionSpeaker<T extends OrderedSessionSpeaker>(
  speakers: T[],
  speakerId: number,
  direction: -1 | 1,
): T[] | null {
  const ordered = [...speakers].sort(compareSessionSpeakers);
  const index = ordered.findIndex(speaker => speaker.id === speakerId);
  const nextIndex = index + direction;
  if (index < 0 || !ordered[nextIndex] || ordered[index].isModerator !== ordered[nextIndex].isModerator) {
    return null;
  }
  [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
  return ordered.map((speaker, displayOrder) => ({ ...speaker, displayOrder }));
}

/** Participation must be in agenda/session-speaker order; repeat speakers use their first appearance. */
export function orderSummitSpeakers<T extends { id: number }>(
  speakers: T[],
  participation: { speakerId: number; year: number }[],
  year?: number,
): T[] {
  if (year === undefined) return speakers;
  const ranks = new Map<number, number>();
  for (const row of participation) {
    if (row.year === year && !ranks.has(row.speakerId)) ranks.set(row.speakerId, ranks.size);
  }
  return [...speakers].sort((a, b) =>
    (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity)
  );
}
