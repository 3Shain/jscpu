import { Flippable, Settable, WireState } from "./types";
import { and, incTime, not, or, Wire } from "./wire";

const noop = () => {};

export class Flipflop extends Wire implements Flippable, Settable {
  protected state: WireState = WireState.LOW;

  constructor(protected input: Wire) {
    super(() => {
      return this.state;
    });
  }

  flip(to: WireState) {
    if (to !== WireState.HIGH) {
      // not high
      return noop;
    }
    const sampled = this.input.sample();
    return () => {
      this.state = sampled;
    };
  }

  set() {
    this.state = WireState.HIGH;
  }

  reset() {
    this.state = WireState.LOW;
  }
}

export class JKFlipflop extends Flipflop {
  constructor(J: Wire, K: Wire) {
    super(
      new Wire(() => {
        return or(and(J, not(this)), and(not(K), this)).sample();
      })
    );
  }
}

export class TFlipflop extends JKFlipflop {
  constructor(T: Wire) {
    super(T, T);
  }
}

export function groupFlip(...f: Flippable[]) {
  return {
    flip(to) {
      const tocks = f.map((x) => x.flip(to));
      return () => tocks.forEach((x) => x());
    },
  } as Flippable;
}

export function invertFlip(f: Flippable) {
  return {
    flip(x) {
      return f.flip((~x & 0b11) | 0b10);
    },
  } as Flippable;
}

export function oneTick(f: Flippable) {
  f.flip(WireState.HIGH)();
  incTime();
  f.flip(WireState.LOW)();
  incTime();
}
