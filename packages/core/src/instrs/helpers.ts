import { Wire, and, not, HIGH } from "./wire";

export function decodeMatch(wires: Wire[], b: number) {
  return and(
    HIGH,
    HIGH,
    ...wires.map((x, i) => {
      if ((b >> i) & 0b1) {
        return x;
      }
      return not(x);
    })
  );
}
