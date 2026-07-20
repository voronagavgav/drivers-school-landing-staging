import { describe, it, expect } from "vitest";
import { groupTopicsByBand } from "./topic-map";
import type { TopicBand, TopicBandEntry } from "./topic-map";

// Build a topic row the way the server reader would.
const t = (
  title: string,
  band: TopicBand,
  meanR: number | null,
): TopicBandEntry => ({ topicId: `id-${title}`, title, band, meanR });

const titles = (xs: Array<{ title: string }>) => xs.map((x) => x.title);

describe("topic-map.groupTopicsByBand", () => {
  it("puts unseen topics (band null) into the weak group", () => {
    const got = groupTopicsByBand([t("Небачена", null, null)]);
    expect(titles(got.weak)).toEqual(["Небачена"]);
    expect(got.learning).toEqual([]);
    expect(got.strong).toEqual([]);
  });

  it("orders weak as seen-by-meanR-asc first, then unseen by title asc", () => {
    const got = groupTopicsByBand([
      t("Небачена-Б", null, null),
      t("Слабка-Б", "weak", 0.5),
      t("Небачена-А", null, null),
      t("Слабка-А", "weak", 0.3),
    ]);
    expect(titles(got.weak)).toEqual([
      "Слабка-А",
      "Слабка-Б",
      "Небачена-А",
      "Небачена-Б",
    ]);
  });

  it("sorts learning and strong by meanR asc, ties by title asc", () => {
    const got = groupTopicsByBand([
      t("Середня-Б", "learning", 0.7),
      t("Середня-А", "learning", 0.6),
      t("Тія-Б", "learning", 0.65),
      t("Тія-А", "learning", 0.65),
      t("Сильна-Б", "strong", 0.98),
      t("Сильна-А", "strong", 0.95),
    ]);
    expect(titles(got.learning)).toEqual([
      "Середня-А",
      "Тія-А",
      "Тія-Б",
      "Середня-Б",
    ]);
    expect(titles(got.strong)).toEqual(["Сильна-А", "Сильна-Б"]);
  });

  it("breaks title ties with the Ukrainian alphabet (Ґ before Д)", () => {
    // Ukrainian orders Ґ before Д, but Ґ's code point is HIGHER — only a
    // uk-locale compare gets this right (a code-point sort would flip it).
    const got = groupTopicsByBand([
      t("Дорога", null, null),
      t("Ґудзик", null, null),
    ]);
    expect(titles(got.weak)).toEqual(["Ґудзик", "Дорога"]);
  });

  it("places every topic in exactly one group and keeps extra fields", () => {
    const rows = [
      { ...t("Слабка", "weak" as TopicBand, 0.4), displayOrder: 7 },
      { ...t("Середня", "learning" as TopicBand, 0.7), displayOrder: 2 },
      { ...t("Сильна", "strong" as TopicBand, 0.95), displayOrder: 5 },
      { ...t("Небачена", null, null), displayOrder: 9 },
    ];
    const got = groupTopicsByBand(rows);
    const total = got.weak.length + got.learning.length + got.strong.length;
    expect(total).toBe(rows.length);
    expect(got.weak[0]!.displayOrder).toBe(7);
    expect(got.learning[0]!.displayOrder).toBe(2);
  });

  it("does not mutate the input array", () => {
    const rows = [t("Б-тема", "weak", 0.5), t("А-тема", "weak", 0.3)];
    groupTopicsByBand(rows);
    expect(titles(rows)).toEqual(["Б-тема", "А-тема"]);
  });
});
