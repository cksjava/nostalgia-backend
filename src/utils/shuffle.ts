export function shuffleInPlace<T>(arr: T[], seed?: number): T[] {
  // Fisher–Yates. Optional deterministic seed if you want repeatable shuffle later.
  let random = Math.random;
  if (typeof seed === "number") {
    let s = seed >>> 0;
    random = () => {
      // simple LCG
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
