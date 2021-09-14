import { Wire } from "./instrs/wire";

const map = ["Z", "*", "L", "H"];

export function logWires(wires: Wire[], tags?: string[]) {
  console.log(
    wires.map((x, i) => (map[x.sample()] + (tags!==undefined ? `(${tags[i]})` : ""))).join(" ")
  );
}

export function logHex(wires: Wire[]) {
  console.log(
    wires
      .map((x, i) => (x.sample() & 0b1) << i)
      .reduce((a, b) => a + b, 0)
      .toString(16)
  );
}
