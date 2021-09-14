import { Wire, lift, or, and, not, LOW, liftS, trigate } from "./wire";
import { memory } from "./memory";
import { fullAdder } from "./alu";
import { groupFlip } from "./flipflop";

/**
 * support unaligned access by hardware
 * but in real world we don't do so? because it's too slow?
 */
export function mmu16(
  {
    A,
    D,
    WD,
    EN,
    ROM,
    MASK_HIGH,
  }: {
    A: Wire[];
    D: Wire[];
    WD: Wire;
    EN: Wire;
    ROM: Uint8Array;
    MASK_HIGH: Wire;
  },
  {
    length,
  }: {
    length: number;
  }
) {
  const ROM_HIGH = ROM.filter((_, i) => i & 1);
  const ROM_LOW = ROM.filter((_, i) => (i & 1) === 0);

  const OFFSET = A.slice(1, 16);
  const UNALIGNED = A[0];

  const _0 = fullAdder(OFFSET[0], LOW, UNALIGNED);
  const fas = [_0];
  for (let i = 1; i < 15; i++) {
    fas.push(fullAdder(OFFSET[i], LOW, fas[i - 1].CARRY));
  }
  const OFFSET_ADD_ONE = fas.map((x) => x.RESULT);

  const lowHalf = memory(
    {
      A: OFFSET_ADD_ONE,
      D: lift(
        (a, b) => {
          return or(and(b, UNALIGNED), and(a, not(UNALIGNED)));
        },
        D.slice(0, 8),
        D.slice(8)
      ),
      WD: and(WD, not(and(UNALIGNED, MASK_HIGH))),
      EN,
      ROM: ROM_LOW,
    },
    {
      length,
    }
  );
  const highHalf = memory(
    {
      A: OFFSET,
      D: lift(
        (a, b) => {
          return or(and(a, UNALIGNED), and(b, not(UNALIGNED)));
        },
        D.slice(0, 8),
        D.slice(8)
      ),
      WD: and(WD, or(not(MASK_HIGH), and(MASK_HIGH, UNALIGNED))),
      EN,
      ROM: ROM_HIGH,
    },
    {
      length,
    }
  );

  const LOW_OUT = lift(
    (a, b) => {
      return or(and(a, not(UNALIGNED)), and(b, UNALIGNED));
    },
    lowHalf.OUT,
    highHalf.OUT
  );
  const HIGH_OUT = lift(
    (a, b) => {
      return or(and(a, UNALIGNED), and(b, not(UNALIGNED)));
    },
    lowHalf.OUT,
    highHalf.OUT
  );

  return {
    ...groupFlip(lowHalf, highHalf),
    TRI_STATE_OUT: [
      ...liftS(trigate, LOW_OUT, EN),
      ...liftS(trigate, HIGH_OUT, EN),
    ],
    MEM: [lowHalf.MEM, highHalf.MEM],
  };
}
