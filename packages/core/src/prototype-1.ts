import {
  and,
  or,
  not,
  forward,
  LOW,
  Wire,
  HIGH,
  HIZ,
  forwards,
} from "./instrs/wire";
import { Bus } from "./instrs/bus";
import { programCounter2, ringCounter } from "./instrs/counter";
import { generalRegister } from "./instrs/register";
import { arthmeticUnit } from "./instrs/alu";
import { decodeMatch } from "./instrs/helpers";
import { groupFlip, invertFlip } from "./instrs/flipflop";
import { logDecimal, logWires } from "./shared";
import { mmu16 } from "./instrs/mmu";

export function prototype1(ROM: Uint8Array) {
  const WIDTH = 16;

  const data_bus = new Bus(WIDTH);

  const {
    controls: {
      ENABLE_MR,
      LOAD_IR,
      ENABLE_A,
      ENABLE_B,
      LOAD_A,
      LOAD_B,
      COUNT_PC,
      COUNT_PC2,
      LOAD_PC,
      ENABLE_PC,
      WD,
      LOAD_MR,
      LOAD_AU,
      ENABLE_AU,
      SUB_AU,
      MASK_HIGH
    },
    flip: flipCu,
    intercept,
  } = controlUnit(forwards(() => ir.OUT, WIDTH));

  const pc = programCounter2(
    {
      CT: or(COUNT_PC, COUNT_PC2),
      CT2: COUNT_PC2,
      LD: LOAD_PC,
      IN: data_bus.WIRES,
      EN: ENABLE_PC,
    },
    { size: WIDTH }
  );
  data_bus.joint(pc.TRI_STATE_OUT);

  const ir = generalRegister(
    {
      LD: LOAD_IR,
      EN: LOW, // not used tri-state ...
      D: data_bus.WIRES,
    },
    { size: WIDTH }
  );

  /** memory */
  const mar = generalRegister(
    {
      LD: LOAD_MR,
      EN: LOW, // not used tri-state...
      D: data_bus.WIRES,
    },
    { size: WIDTH }
  );

  const mem = mmu16(
    {
      EN: ENABLE_MR,
      WD: WD,
      A: mar.OUT,
      D: data_bus.WIRES,
      ROM,
      MASK_HIGH,
    },
    { length: 0xffff }
  );
  data_bus.joint(mem.TRI_STATE_OUT);

  /** registers */
  const accumulator = generalRegister(
    {
      LD: LOAD_A,
      EN: ENABLE_A,
      RTL: LOW,
      RTR: LOW,
      SHL: LOW,
      SHR: LOW,
      D: data_bus.WIRES,
      MASK_HIGH
    },
    { size: WIDTH }
  );
  data_bus.joint(accumulator.TRI_STATE_OUT);
  const b_reg = generalRegister(
    {
      LD: LOAD_B,
      EN: ENABLE_B,
      RTL: LOW,
      RTR: LOW,
      SHL: LOW,
      SHR: LOW,
      D: data_bus.WIRES,
      MASK_HIGH
    },
    { size: WIDTH }
  );
  data_bus.joint(b_reg.TRI_STATE_OUT);

  const au = arthmeticUnit({
    A: accumulator.OUT,
    B: data_bus.WIRES,
    SUB: SUB_AU,
    EN: ENABLE_AU,
    LD: LOAD_AU,
  });
  data_bus.joint(au.TRI_STATE_OUTPUT);

  //

  return {
    ...groupFlip(
      {
        flip: flipCu,
      },
      invertFlip(pc),
      invertFlip(ir),
      invertFlip(mar),
      invertFlip(mem),
      invertFlip(accumulator),
      invertFlip(b_reg),
      invertFlip(au)
    ),
    intercept() {
      intercept();
      console.log("A");
      logDecimal(accumulator.OUT);
      console.log("b");
      logDecimal(b_reg.OUT);
      console.log("PC");
      logDecimal(pc.OUT);
    },
  };
}

function controlUnit([
  i0,
  i1,
  i2,
  i3,
  i4,
  i5,
  i6,
  i7,
  s0,
  s1,
  s2,
  s3,
  r0,
  r1,
  r2,
  r3,
]: Wire[]) {
  const {
    flip,
    OUT: [T1, T2, T3, T4, T5, T6, T7, T8, T9],
  } = ringCounter(
    {
      RESET: forward(() => RESET_RC),
      COUNT: forward(() => COUNT_RC),
    },
    { size: 7 }
  ); // maximum 12 t-cycle

  /** instructions */

  const instcode = [i0, i1, i2, i3, i4, i5, i6];
  // initial: 0 0 0 0
  const HALT = decodeMatch(instcode, 0b001111);
  const NOP = decodeMatch(instcode, 0b011011);

  const MASK_HIGH = i7;

  const MOV_IMM_REG = decodeMatch(instcode, 0b001000);
  const MOV_REG_REG = decodeMatch(instcode, 0b001001);
  const MOV_MEM_REG = decodeMatch(instcode, 0b001010);
  const MOV_REG_MEM = decodeMatch(instcode, 0b001011);

  const ADD = decodeMatch(instcode, 0b000100);
  const SUB = decodeMatch(instcode, 0b000101);
  const ADDI = decodeMatch(instcode, 0b000110);
  const SUBI = decodeMatch(instcode, 0b000111);

  const sources = [s0, s1, s2, s3];
  const SOURCE_A = decodeMatch(sources, 0b0001);
  const SOURCE_B = decodeMatch(sources, 0b0010);

  const targets = [r0, r1, r2, r3];
  const TARGET_A = decodeMatch(targets, 0b0001);
  const TARGET_B = decodeMatch(targets, 0b0010);

  /** control matrix */

  const ESCAPE_PC2 = or(
    and(T3, MOV_REG_REG),
    and(T5, MOV_IMM_REG, not(MASK_HIGH)),
    and(T6, MOV_MEM_REG, not(MASK_HIGH)),
    and(T6, MOV_REG_MEM, not(MASK_HIGH)),
    and(T4, ADD),
    and(T4, SUB)
  );

  const ESCAPE_PC1 = or(
    and(T3, NOP),
    and(T5, MOV_IMM_REG, MASK_HIGH),
    and(T6, MOV_MEM_REG, MASK_HIGH),
    and(T6, MOV_REG_MEM, MASK_HIGH)
  );

  const RESET_RC = or(HALT, and(T5, MOV_IMM_REG), ESCAPE_PC2, ESCAPE_PC1);
  const COUNT_RC = and(not(HALT), not(RESET_RC));

  const controls = {
    LOAD_PC: LOW,
    ENABLE_PC: or(
      and(not(HALT), T1),
      and(T4, MOV_IMM_REG),
      and(T4, MOV_MEM_REG),
      and(T4, MOV_REG_MEM)
    ),
    COUNT_PC2: or(
      ESCAPE_PC2,
      and(T3, MOV_IMM_REG),
      and(T3, MOV_MEM_REG),
      and(T3, MOV_REG_MEM)
    ),
    COUNT_PC: ESCAPE_PC1,
    LOAD_IR: T2,
    LOAD_A: or(
      and(T5, MOV_IMM_REG, TARGET_A),
      and(T3, MOV_REG_REG, TARGET_A),
      and(T6, MOV_MEM_REG, TARGET_A), //w
      /* au */
      and(T4, ADD, TARGET_A),
      and(T4, SUB, TARGET_A)
    ),
    ENABLE_A: or(
      and(T3, MOV_REG_REG, SOURCE_A), //1
      and(T6, MOV_REG_MEM, SOURCE_A),
      /* au */
      and(T3, ADD, SOURCE_A),
      and(T3, SUB, SOURCE_A)
    ),
    LOAD_B: or(
      and(T5, MOV_IMM_REG, TARGET_B),
      and(T3, MOV_REG_REG, TARGET_B), //w
      and(T6, MOV_MEM_REG, TARGET_B), //w
      /* au */
      and(T4, ADD, TARGET_B),
      and(T4, SUB, TARGET_B)
    ),
    ENABLE_B: or(
      and(T3, MOV_REG_REG, SOURCE_B), //1
      and(T6, MOV_REG_MEM, SOURCE_B),
      /* au */
      and(T3, ADD, SOURCE_B),
      and(T3, SUB, SOURCE_B)
    ),
    ENABLE_AU: or(and(T4, ADD), and(T4, SUB)),
    SUB_AU: and(T3, SUB),
    LOAD_AU: or(and(T3, ADD), and(T3, SUB)),
    ENABLE_LU: LOW,
    LOAD_MR: or(
      and(not(HALT), T1),
      and(T4, MOV_IMM_REG),
      and(T4, MOV_MEM_REG), // like above
      and(T5, MOV_MEM_REG),
      and(T4, MOV_REG_MEM), // live above (t4)
      and(T5, MOV_REG_MEM)
    ),
    ENABLE_MR: or(
      T2,
      and(T5, MOV_IMM_REG),
      and(T5, MOV_MEM_REG), //w
      and(T6, MOV_MEM_REG), //w
      and(T5, MOV_REG_MEM) //w
    ),
    WD: or(
      LOW, //?
      and(T6, MOV_REG_MEM)
    ),
    MASK_HIGH: and(MASK_HIGH, not(T1), not(T2)),
  };

  return {
    controls,
    flip,
    intercept() {
      console.log("ring counter:");
      logWires([T1, T2, T3, T4, T5, T6, T7]);
      console.log("controls");
      logWires(
        [
          RESET_RC,
          COUNT_RC,
          controls.ENABLE_PC,
          controls.LOAD_MR,
          controls.ENABLE_MR,
          controls.LOAD_IR,
          controls.COUNT_PC,
          controls.LOAD_A,
          controls.LOAD_B,
          controls.ENABLE_A,
          controls.ENABLE_B,
        ],
        [
          "RESET_RC",
          "COUNT_RC",
          "ENABLE_PC",
          "LOAD_MR",
          "ENABLE_MR",
          "LOAD_IR",
          "COUNT_PC",
          "LOAD_A",
          "LOAD_B",
          "EN_A",
          "EN_B",
        ]
      );
      console.log("current instruct");
      logWires(instcode);
    },
  };
}
