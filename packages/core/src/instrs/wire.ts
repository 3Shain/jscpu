import { SampleWire, WireState } from "./types";

let TIME = 0;

export function incTime() {
  TIME++;
}

export class Wire {
  constructor(private readonly _sample: SampleWire) {}

  history: WireState;
  time = -1;

  sample() {
    if (this.time != TIME) {
      this.time = TIME;
      this.history = this._sample();
    }
    return this.history;
  }
}

export const HIGH = new Wire(() => WireState.HIGH);

export const LOW = new Wire(() => WireState.LOW);

export const HIZ = new Wire(() => WireState.HiZ);

export function joint(wire1: Wire, wire2: Wire) {
  return new Wire(() => ~(~wire1.sample() & ~wire2.sample()));
}

export function lift<T>(
  fn: (wire1: Wire, wire2: Wire) => T,
  wire: Wire[],
  wire2: Wire[]
) {
  return wire.map((x, i) => {
    return fn(x, wire2[i]);
  });
}

export function liftS<T>(
  fn: (wire1: Wire, wire2: Wire) => T,
  wire: Wire[],
  wire2: Wire
) {
  return wire.map((x, i) => {
    return fn(x, wire2);
  });
}

const noop = () => {};

export function trigate(input: Wire, control: Wire) {
  return new Wire(() => {
    if (control.sample() === WireState.HIGH) {
      return input.sample();
    }
    return WireState.HiZ;
  });
}

export function and(a: Wire, b: Wire, ...wires: Wire[]): Wire {
  if (wires.length) {
    return and(and(a, b), wires[0], ...wires.slice(1));
  }
  return new Wire(() => a.sample() & b.sample());
}

export function andN(a: Wire[], len: number): Wire {
  return new Wire(() => {
    let ret = a[0].sample();
    for (let i = 0; i < len; i++) {
      ret &= a[i + 1].sample();
    }
    return ret;
  });
}

export function or(a: Wire, b: Wire, ...wires: Wire[]): Wire {
  if (wires.length) {
    return or(or(a, b), wires[0], ...wires.slice(1));
  }
  return new Wire(() => a.sample() | b.sample());
}

export function xor(a: Wire, b: Wire, ...wires: Wire[]): Wire {
  if (wires.length) {
    return xor(xor(a, b), wires[0], ...wires.slice(1));
  }
  return new Wire(() => (a.sample() ^ b.sample()) | 0b10);
}

export function not(a: Wire): Wire {
  return new Wire(() => (~a.sample() & 0b1) | 0b10);
}

export function forward(ref: () => Wire): Wire {
  let refMemo: Wire = null;
  return new Wire(() => {
    if (refMemo === null) {
      refMemo = ref();
    }
    return refMemo.sample();
  });
}

export function forwards(refs: () => Wire[], length: number): Wire[] {
  let refsMemo: Wire[] = null;
  return new Array(length).fill(null).map((_, i) => {
    return new Wire(() => {
      if (refsMemo === null) {
        refsMemo = refs();
      }
      return refsMemo[i].sample();
    });
  });
}
