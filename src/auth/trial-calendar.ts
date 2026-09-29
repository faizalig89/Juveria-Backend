export function addOneCalendarMonth(
  input: Date,
): Date {
  const source = new Date(
    input.getTime(),
  );

  const day =
    source.getUTCDate();

  const target =
    new Date(
      source.getTime(),
    );

  /*
   * Move to day one before changing month so dates such
   * as 31 January do not skip February.
   */
  target.setUTCDate(1);
  target.setUTCMonth(
    target.getUTCMonth() + 1,
  );

  const lastDayOfTargetMonth =
    new Date(
      Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();

  target.setUTCDate(
    Math.min(
      day,
      lastDayOfTargetMonth,
    ),
  );

  return target;
}
