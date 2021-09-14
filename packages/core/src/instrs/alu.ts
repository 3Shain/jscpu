import { groupFlip } from "./flipflop";
import { bitRegister, generalRegister } from "./register";
import { and, LOW, not, Wire, xor, or, liftS, trigate, HIGH } from "./wire";

export function fullAdder(a: Wire, b: Wire, c: Wire) {
  return {
    RESULT: xor(a, b, c),
    CARRY: or(and(a, b), and(b, c), and(a, c)),
  };
}

export function arthmeticUnit({
  A: B,
  B: A,
  SUB,
  EN,
  LD,
  ONE = LOW,
}: {
  A: Wire[];
  B: Wire[];
  SUB: Wire;
  EN: Wire;
  LD: Wire;
  ONE?: Wire;
}) {
  const size = A.length;
  const init = fullAdder(
    A[0],
    xor(or(and(ONE, HIGH), and(B[0], not(ONE))), SUB),
    SUB
  );
  const fas = [init];
  for (let i = 1; i < size; i++) {
    fas.push(
      fullAdder(
        A[i],
        xor(or(and(ONE, LOW), and(B[i], not(ONE))), SUB),
        fas[i - 1].CARRY
      )
    );
  }

  const result = fas.map((x) => x.RESULT);

  const buffer = generalRegister(
    {
      LD,
      EN,
      D: result,
    },
    { size }
  );

  const cflag = bitRegister({
    LD,
    EN,
    D: xor(fas[size - 1].CARRY, SUB),
  });
  const zflag = bitRegister({
    LD,
    EN,
    D: not(or(LOW, LOW, ...result)),
  });
  const nzflag = bitRegister({
    LD,
    EN,
    D: or(LOW, LOW, ...result),
  });

  return {
    ...groupFlip(buffer, cflag, zflag, nzflag),
    TRI_STATE_OUTPUT: buffer.TRI_STATE_OUT,
    C_FLAG: cflag.OUT,
    Z_FLAG: zflag.OUT,
    NZ_FLAG: nzflag.OUT,
  };
}

export function logicUnit({
  A,
  B,
  AND,
  OR,
  XOR,
  NOT,
  EN,
}: {
  A: Wire[];
  B: Wire[];
  EN: Wire;
  AND: Wire;
  OR: Wire;
  XOR: Wire;
  NOT: Wire;
}) {
  return liftS(
    trigate,
    A.map((a, i) =>
      or(
        and(AND, and(a, B[i])),
        and(OR, or(a, B[i])),
        and(XOR, xor(a, B[i])),
        and(NOT, not(a))
      )
    ),
    EN
  );
}
