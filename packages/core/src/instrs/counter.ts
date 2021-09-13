import {
  Wire,
  not,
  andN,
  and,
  forward,
  liftS,
  or,
  trigate,
  LOW,
  HIGH,
} from "./wire";
import { JKFlipflop } from "./flipflop";
import { WireState } from "./types";

export function programCounter(
  {
    CT,
    LD,
    IN,
    EN,
  }: {
    CT: Wire; //count
    LD: Wire; // enable load
    IN: Wire[];
    EN: Wire; //
  },
  {
    size,
  }: {
    size: number;
  }
) {
  const source = new JKFlipflop(
    or(CT, and(LD, IN[0])),
    or(CT, and(LD, not(IN[0])))
  );
  const output = [source];
  for (let i = 1; i < size; i++) {
    output.push(
      new JKFlipflop(
        or(and(andN(output, i - 1), CT), and(LD, IN[i])),
        or(and(andN(output, i - 1), CT), and(LD, not(IN[i])))
      )
    );
  }

  return {
    flip(xx: WireState) {
      const g = output.map((x) => x.flip(xx));
      return () => g.forEach((x) => x());
    },
    OUT: output,
    TRI_STATE_OUT: liftS(trigate, output, EN),
  };
}

export function ringCounter(
  {
    RESET,
    COUNT,
  }: {
    RESET: Wire;
    COUNT: Wire;
  },
  {
    size,
  }: {
    size: number;
  }
) {
  const init = new JKFlipflop(
    forward(() => or(and(not(output[size - 1]), COUNT), and(RESET, LOW))),
    forward(() => or(and(output[size - 1], COUNT), and(RESET, HIGH)))
  );
  const output: JKFlipflop[] = [init];
  output.push(
    new JKFlipflop(
      or(and(not(output[0]), COUNT), and(RESET, LOW)),
      or(and(output[0], COUNT), and(RESET, HIGH))
    )
  );
  for (let i = 2; i < size; i++) {
    output.push(
      new JKFlipflop(
        or(and(output[i - 1], COUNT), and(RESET, LOW)),
        or(and(not(output[i - 1]), COUNT), and(RESET, HIGH))
      )
    );
  }
  const OUT: Wire[] = [...output];
  OUT[0] = not(OUT[0]);
  return {
    flip(xx: WireState) {
      const g = output.map((x) => x.flip(xx));
      return () => g.forEach((x) => x());
    },
    OUT,
  };
}
