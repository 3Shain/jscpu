import { Flipflop, groupFlip, JKFlipflop } from "./flipflop";
import { Wire, and, or, not, HIGH, LOW, forward } from "./wire";

function interrupt({ ANSWER }: { ANSWER: Wire }) {
  const _0 = singleIntr({
    ANSWER: forward(() => and(IP0, ANSWER)),
    IN: LOW,
    MASK: LOW,
  });
  const _1 = singleIntr({
    ANSWER: forward(() => and(IP1, ANSWER)),
    IN: LOW,
    MASK: LOW,
  });
  const _2 = singleIntr({
    ANSWER: forward(() => and(IP2, ANSWER)),
    IN: LOW,
    MASK: LOW,
  });
  const _3 = singleIntr({
    ANSWER: forward(() => and(IP3, ANSWER)),
    IN: LOW,
    MASK: LOW,
  });

  const I0 = HIGH;
  const I1 = and(I0, not(_0.IR));
  const I2 = and(I1, not(_1.IR));
  const I3 = and(I2, not(_2.IR));

  const IP0 = and(I0, _0.IR);
  const IP1 = and(I1, _1.IR);
  const IP2 = and(I2, _2.IR);
  const IP3 = and(I3, _3.IR);
  return {
    ...groupFlip(_0, _1, _2, _3),
    DATA: [LOW, LOW, or(IP2, IP3), or(IP1, IP3)],
    INTR: or(IP0, IP1, IP2, IP3),
  };
}

function singleIntr(input: { IN: Wire; ANSWER: Wire; MASK: Wire }) {
  const reg = new JKFlipflop(and(input.IN, not(input.MASK)), input.ANSWER);

  return {
    ...groupFlip(reg),
    IR: reg,
  };
}

export const d = 1;
