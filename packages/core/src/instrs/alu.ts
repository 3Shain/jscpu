import { groupFlip } from "./flipflop";
import { bitRegister, shiftRegsiter } from "./register";
import { and, LOW, not, Wire, xor, or, liftS, trigate } from "./wire";

function fullAdder(a: Wire, b: Wire, c: Wire) {
  return {
    RESULT: xor(a, b, c),
    CARRY: or(and(a, b), and(b, c), and(a, c)),
  };
}

export function arthmeticUnit({
  A,
  B,
  SUB,
  EN,
  LD,
}: {
  A: Wire[];
  B: Wire[];
  SUB: Wire;
  EN: Wire;
  LD: Wire;
}) {
  const size = A.length;
  const init = fullAdder(A[0], xor(B[0], SUB), SUB);
  const fas = [init];
  for (let i = 1; i < size; i++) {
    fas.push(fullAdder(A[i], xor(B[i], SUB), fas[i - 1].CARRY));
  }

  const result = fas.map((x) => x.RESULT);

  const buffer = shiftRegsiter(
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

  return {
    ...groupFlip(buffer, cflag),
    TRI_STATE_OUTPUT: buffer.TRI_STATE_OUT,
    C_FLAG: cflag.TRI_STATE_OUTPUT,
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
