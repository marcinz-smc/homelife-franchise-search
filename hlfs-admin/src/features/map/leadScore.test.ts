import { formatScore, overallScoreBand, ratingTone } from "./leadScore";

test("bands overall scores into low, medium, and good", () => {
  expect(overallScoreBand(52.5)).toBe("low");
  expect(overallScoreBand(62)).toBe("medium");
  expect(overallScoreBand(75)).toBe("good");
  expect(overallScoreBand(88)).toBe("good");
});

test("colors individual ratings by strength", () => {
  expect(ratingTone(38)).toBe("low");
  expect(ratingTone(60)).toBe("medium");
  expect(ratingTone(70)).toBe("good");
});

test("formats scores without noisy decimals", () => {
  expect(formatScore(63)).toBe("63");
  expect(formatScore(52.5)).toBe("52.5");
  expect(formatScore(93.33)).toBe("93.3");
  expect(formatScore(null)).toBe("—");
});
