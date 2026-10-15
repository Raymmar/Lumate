/** Whether an unscheduled presentation can be assigned by the agenda backfill. */
export function canAutoAssignPresentation(presentation: {
  timeBlockId?: number | null;
  startTime?: string | null;
  endTime?: string | null;
}): boolean {
  return !presentation.timeBlockId
    && !!presentation.startTime
    && !!presentation.endTime
    && !Number.isNaN(new Date(presentation.startTime).getTime())
    && !Number.isNaN(new Date(presentation.endTime).getTime());
}
