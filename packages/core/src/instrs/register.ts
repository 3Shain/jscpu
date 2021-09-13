import { and, forward, HIGH, liftS, LOW, not, or, trigate, Wire } from "./wire";
import { JKFlipflop } from "./flipflop";
import { WireState } from "./types";

export function bitRegister({ LD, EN, D }: { LD: Wire; EN: Wire; D: Wire }) {
  const flip = new JKFlipflop(and(D, LD), and(not(D), LD));
  return {
    OUT: flip,
    TRI_STATE_OUTPUT: trigate(flip, EN),
    flip(x){
      return flip.flip(x);
    }
  };
}

export function shiftRegsiter(
  {
    LD,
    EN,
    D,
    RTL = LOW,
    RTR = LOW,
    SHL = LOW,
    SHR = LOW,
  }: {
    LD: Wire;
    EN: Wire;
    D: Wire[];
    RTL?: Wire;
    RTR?: Wire;
    SHL?: Wire;
    SHR?: Wire;
  },
  {
    size,
  }: {
    size: number;
  }
) {
  const REGS: JKFlipflop[] = new Array(size).fill(null).map((_, i) => {
    const flipflop = new JKFlipflop(
      forward(() =>
        or(
          and(D[i], LD),
          and(REGS[i - 1 < 0 ? i + size - 1 : i - 1], RTL),
          and(REGS[i + 1 >= size ? i + 1 - size : i + 1], RTR),
          and(i - 1 < 0 ? LOW : REGS[i - 1], SHL),
          and(i + 1 >= size ? LOW : REGS[i + 1], SHR)
        )
      ),
      forward(() =>
        or(
          and(not(D[i]), LD),
          and(not(REGS[i - 1 < 0 ? i + size - 1 : i - 1]), RTL),
          and(not(REGS[i + 1 >= size ? i + 1 - size : i + 1]), RTR),
          and(not(i - 1 < 0 ? LOW : REGS[i - 1]), SHL),
          and(not(i + 1 >= size ? LOW : REGS[i + 1]), SHR)
        )
      )
    );
    return flipflop;
  });
  return {
    flip(x: WireState) {
      const g = REGS.map((xx) => xx.flip(x));
      return () => g.forEach((x) => x());
    },
    set(value: number) {
      for (let i = 0; i < size; i++) {
        if ((value >> i) & 1) {
          REGS[i].set();
        } else {
          REGS[i].reset();
        }
      }
    },
    TRI_STATE_OUT: liftS(trigate, REGS, EN),
    OUT: REGS,
  };
}
