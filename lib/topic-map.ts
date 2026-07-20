// ---------------------------------------------------------------------------
// Pure grouping for the «Карта тем» anti-leaderboard on /progress (spec §F).
// Given every servable topic of a category joined with the user's materialized
// TopicMastery evidence (band + meanR), bucket them into the three display
// groups. No DB, no React — the server layer supplies the rows and the page
// just renders the groups in weak → learning → strong order.
//
// Frozen semantics (task wave12b-16 probe):
// - band null (no TopicMastery row yet, i.e. unseen) → the `weak` group;
// - within `weak`: seen topics first, sorted by meanR ascending (weakest
//   evidence first), then the unseen (meanR null) after them — each subgroup
//   tie-broken by title ascending;
// - `learning` and `strong` sorted by meanR ascending, ties by title ascending.
// Title ties use the Ukrainian collation (bare localeCompare would order Ґ
// after Д by code point).
// ---------------------------------------------------------------------------

/** The mastery band a topic can carry; null = no TopicMastery row yet. */
export type TopicBand = "weak" | "learning" | "strong" | null;

/** One topic row as the server reader supplies it. */
export interface TopicBandEntry {
  topicId: string;
  title: string;
  band: TopicBand;
  meanR: number | null;
}

/** The three display groups, in the order the page renders them. */
export interface TopicMapGroups<T extends TopicBandEntry = TopicBandEntry> {
  weak: T[];
  learning: T[];
  strong: T[];
}

const byTitle = (a: TopicBandEntry, b: TopicBandEntry) =>
  a.title.localeCompare(b.title, "uk");

const byMeanRThenTitle = (a: TopicBandEntry, b: TopicBandEntry) =>
  (a.meanR ?? 0) - (b.meanR ?? 0) || byTitle(a, b);

/**
 * Bucket every topic into the weak / learning / strong display groups.
 * Pure and non-mutating: the input array and its entries are left untouched.
 * Every input topic lands in exactly one group; unseen topics (band null)
 * belong under weak so the map always shows the full 65-topic picture.
 */
export function groupTopicsByBand<T extends TopicBandEntry>(
  topics: T[],
): TopicMapGroups<T> {
  const seenWeak: T[] = [];
  const unseen: T[] = [];
  const learning: T[] = [];
  const strong: T[] = [];

  for (const topic of topics) {
    if (topic.band === "learning") learning.push(topic);
    else if (topic.band === "strong") strong.push(topic);
    else if (topic.band === "weak" && topic.meanR != null) seenWeak.push(topic);
    else unseen.push(topic);
  }

  seenWeak.sort(byMeanRThenTitle);
  unseen.sort(byTitle);
  learning.sort(byMeanRThenTitle);
  strong.sort(byMeanRThenTitle);

  return { weak: [...seenWeak, ...unseen], learning, strong };
}
