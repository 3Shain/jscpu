import { WireState } from "./types";
import { liftS, trigate, Wire } from "./wire";

function getBinary(A: Wire[]) {
  return A.map((x, i) => (x.sample() & 1) << i).reduce((a, b) => a + b, 0);
}

/**
 * 8-bits memory
 * @param param0
 * @param param1
 * @returns
 */
export function memory(
  {
    D,
    A,
    EN,
    WD,
    ROM,
  }: {
    EN: Wire;
    D: Wire[];
    A: Wire[];
    WD: Wire;
    ROM?: Uint8Array;
  },
  {
    length,
  }: {
    length: number;
  }
) {
  const s = new Uint8Array(length);
  ROM && s.set(ROM, 0);

  const pa = new Array(8).fill(null).map((_, i) => {
    return new Wire(() => {
      const addr = getBinary(A);
      const value = s[addr];
      return (value >> i) & 1 ? WireState.HIGH : WireState.LOW;
    });
  });

  return {
    flip(x: WireState) {
      if (x !== WireState.HIGH) {
        return () => {};
      }
      // it's simulated behavior
      if (WD.sample() !== WireState.HIGH) {
        return () => {};
      }
      const sampled = getBinary(D);
      const addr = getBinary(A);
      return () => {
        s[addr] = sampled;
      };
    },
    OUT: pa,
    TRI_STATE_OUT: liftS(trigate, pa, EN),
    MEM: s,
  };
}
