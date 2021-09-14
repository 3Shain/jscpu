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
import { logHex, logWires } from "./shared";
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
      ENABLE_C,
      ENABLE_D,
      LOAD_A,
      LOAD_B,
      LOAD_C,
      LOAD_D,
      COUNT_PC,
      COUNT_PC2,
      LOAD_PC,
      ENABLE_PC,
      WD,
      LOAD_MAR,
      LOAD_AU,
      ENABLE_AU,
      SUB_AU,
      MASK_HIGH,
      LOAD_SP,
      ENABLE_SP,
      ONE_AU,
    },
    flip: flipCu,
    intercept,
  } = controlUnit(
    forwards(() => ir.OUT, WIDTH),
    {
      ZFLAG: forward(() => au.Z_FLAG),
      NZFLAG: forward(() => au.NZ_FLAG),
    }
  );

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
      LD: LOAD_MAR,
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
      MASK_HIGH,
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
      MASK_HIGH,
    },
    { size: WIDTH }
  );
  data_bus.joint(b_reg.TRI_STATE_OUT);
  const c_reg = generalRegister(
    {
      LD: LOAD_C,
      EN: ENABLE_C,
      D: data_bus.WIRES,
      MASK_HIGH,
    },
    { size: WIDTH }
  );
  data_bus.joint(c_reg.TRI_STATE_OUT);
  const d_reg = generalRegister(
    {
      LD: LOAD_D,
      EN: ENABLE_D,
      D: data_bus.WIRES,
      MASK_HIGH,
    },
    { size: WIDTH }
  );
  data_bus.joint(d_reg.TRI_STATE_OUT);

  const sp_reg = generalRegister(
    {
      LD: LOAD_SP,
      EN: ENABLE_SP,
      D: data_bus.WIRES,
      // MASK_HIGH
    },
    { size: WIDTH }
  );
  sp_reg.set(0x30);
  data_bus.joint(sp_reg.TRI_STATE_OUT);

  const au = arthmeticUnit({
    A: accumulator.OUT,
    B: data_bus.WIRES,
    SUB: SUB_AU,
    EN: ENABLE_AU,
    LD: LOAD_AU,
    ONE: ONE_AU,
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
      invertFlip(c_reg),
      invertFlip(d_reg),
      invertFlip(sp_reg),
      invertFlip(au)
    ),
    intercept() {
      intercept();
      console.log("A");
      logHex(accumulator.OUT);
      console.log("b");
      logHex(b_reg.OUT);
      console.log("PC");
      logHex(pc.OUT);
      console.log("SP");
      logHex(sp_reg.OUT);
      console.log("Z NZ");
      logWires([au.Z_FLAG,au.NZ_FLAG]);
    },
    MEM: mem.MEM,
  };
}

function controlUnit(
  [i0, i1, i2, i3, i4, i5, i6, i7, s0, s1, s2, s3, r0, r1, r2, r3]: Wire[],
  {
    ZFLAG,
    NZFLAG,
  }: {
    ZFLAG: Wire;
    NZFLAG: Wire;
  }
) {
  const {
    flip,
    OUT: [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10],
  } = ringCounter(
    {
      RESET: forward(() => RESET_RC),
      COUNT: forward(() => COUNT_RC),
    },
    { size: 10 }
  );

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

  const INC = decodeMatch(instcode, 0b001100);
  const DEC = decodeMatch(instcode, 0b001101);

  const JMP_IMM = decodeMatch(instcode, 0b010100);
  const JZ_IMM = decodeMatch(instcode, 0b010110);
  const JNZ_IMM = decodeMatch(instcode, 0b010111);

  const PUSH_REG = decodeMatch(instcode, 0b011100);
  const POP_REG = decodeMatch(instcode, 0b011101);

  const CALL_REG = decodeMatch(instcode, 0b011000);
  const RET_REG = decodeMatch(instcode, 0b011001);

  const sources = [s0, s1, s2, s3];
  const SOURCE_A = decodeMatch(sources, 0b0001);
  const SOURCE_B = decodeMatch(sources, 0b0010);
  const SOURCE_C = decodeMatch(sources, 0b0011);
  const SOURCE_D = decodeMatch(sources, 0b0100);
  const SOURCE_SP = decodeMatch(sources, 0b1110);

  const targets = [r0, r1, r2, r3];
  const TARGET_A = decodeMatch(targets, 0b0001);
  const TARGET_B = decodeMatch(targets, 0b0010);
  const TARGET_C = decodeMatch(targets, 0b0011);
  const TARGET_D = decodeMatch(targets, 0b0100);
  const TARGET_SP = decodeMatch(targets, 0b1110);

  /** control matrix */

  const ESCAPE_PC2 = or(
    and(T3, MOV_REG_REG),
    and(T5, MOV_IMM_REG, not(MASK_HIGH)),
    and(T6, MOV_MEM_REG, not(MASK_HIGH)),
    and(T6, MOV_REG_MEM, not(MASK_HIGH)),
    and(T4, ADD),
    and(T4, SUB),
    and(T4, INC),
    and(T4, DEC),
    /////////////
    and(T6, MASK_HIGH, PUSH_REG),
    and(T8, not(MASK_HIGH), PUSH_REG),
    and(T8, POP_REG),
    //////////////
    and(T4, JZ_IMM, not(ZFLAG)),
    and(T4, JNZ_IMM, not(NZFLAG))
  );

  const ESCAPE_PC1 = or(
    and(T3, NOP),
    and(T5, MOV_IMM_REG, MASK_HIGH),
    and(T6, MOV_MEM_REG, MASK_HIGH),
    and(T6, MOV_REG_MEM, MASK_HIGH)
    ////////////////////////////////
  );

  const RESET_RC = or(
    HALT,
    and(T5, MOV_IMM_REG),
    ESCAPE_PC2,
    ESCAPE_PC1,
    and(T5, JMP_IMM),
    and(T5, JZ_IMM), ////IF NO SKIPED
    and(T5, JNZ_IMM), ////IF NOT SKIPED
    and(T10, CALL_REG),
    and(T8, RET_REG)
  );
  const COUNT_RC = and(not(HALT), not(RESET_RC));

  function loadReg(TARGET: Wire) {
    return or(
      and(T5, MOV_IMM_REG, TARGET),
      and(T3, MOV_REG_REG, TARGET), //w
      and(T6, MOV_MEM_REG, TARGET), //w
      /* au */
      and(T4, ADD, TARGET),
      and(T4, SUB, TARGET),
      and(T4, INC, TARGET),
      and(T4, DEC, TARGET),
      //////////////////////
      and(T8, POP_REG, TARGET)
    );
  }

  function enableReg(SOURCE: Wire) {
    return or(
      and(T3, MOV_REG_REG, SOURCE), //1
      and(T6, MOV_REG_MEM, SOURCE),
      /* au */
      and(T3, ADD, SOURCE),
      and(T3, SUB, SOURCE),
      and(T3, INC, SOURCE),
      and(T3, DEC, SOURCE),
      //////////////////////
      and(T4, PUSH_REG, SOURCE),
      and(T10, CALL_REG, SOURCE)
    );
  }

  const controls = {
    LOAD_PC: or(
      and(T5, JMP_IMM),
      and(T5, JZ_IMM), ////IF NO SKIPED
      and(T5, JNZ_IMM), ////IF NOT SKIPED
      and(T10, CALL_REG),
      and(T8, RET_REG)
    ),
    ENABLE_PC: or(
      and(not(HALT), T1),
      and(T4, MOV_IMM_REG),
      and(T4, MOV_MEM_REG),
      and(T4, MOV_REG_MEM),
      and(T4, JMP_IMM),
      and(T4, JZ_IMM, ZFLAG),
      and(T4, JNZ_IMM, NZFLAG),
      /////////////////
      and(T5, CALL_REG)
    ),
    COUNT_PC2: or(
      ESCAPE_PC2,
      and(T3, MOV_IMM_REG),
      and(T3, MOV_MEM_REG),
      and(T3, MOV_REG_MEM),
      and(T3, CALL_REG)
    ),
    COUNT_PC: or(
      ESCAPE_PC1,
      and(T3, JMP_IMM),
      and(T3, JZ_IMM),
      and(T3, JNZ_IMM)
    ),
    LOAD_IR: T2,
    LOAD_A: loadReg(TARGET_A),
    ENABLE_A: enableReg(SOURCE_A),
    LOAD_B: loadReg(TARGET_B),
    ENABLE_B: enableReg(SOURCE_B),
    LOAD_C: loadReg(TARGET_C),
    ENABLE_C: enableReg(SOURCE_C),
    LOAD_D: loadReg(TARGET_D),
    ENABLE_D: enableReg(SOURCE_D),
    ENABLE_AU: or(
      and(T4, ADD),
      and(T4, SUB),
      and(T4, INC),
      and(T4, DEC),
      and(T6, PUSH_REG),
      and(T8, PUSH_REG),
      and(T4, POP_REG),
      and(T6, POP_REG, not(MASK_HIGH)),
      //////////////

      and(T7, CALL_REG),
      and(T9, CALL_REG),

      and(T4, RET_REG),
      and(T6, RET_REG)
    ),
    SUB_AU: or(
      and(T3, SUB),
      and(T3, DEC),
      and(T3, POP_REG),
      and(T5, POP_REG, not(MASK_HIGH)),
      and(T3, RET_REG),
      and(T5, RET_REG)
    ),
    LOAD_AU: or(
      and(T3, ADD),
      and(T3, SUB),
      and(T3, INC),
      and(T3, DEC),
      and(T5, PUSH_REG),
      and(T7, PUSH_REG),
      and(T3, POP_REG),
      and(T5, POP_REG, not(MASK_HIGH)),
      //////////////////////

      and(T6, CALL_REG),
      and(T8, CALL_REG),
      and(T3, RET_REG),
      and(T5, RET_REG)
    ),
    ENABLE_LU: LOW,
    LOAD_MAR: or(
      and(not(HALT), T1),
      and(T4, MOV_IMM_REG),
      and(T4, MOV_MEM_REG), // like above
      and(T5, MOV_MEM_REG),
      and(T4, MOV_REG_MEM), // live above (t4)
      and(T5, MOV_REG_MEM),
      ////////////
      and(T4, JMP_IMM),
      and(T4, JZ_IMM, ZFLAG),
      and(T4, JNZ_IMM, NZFLAG),
      ////////////
      and(T3, PUSH_REG),
      and(T7, POP_REG),
      ////////////
      and(T4, CALL_REG),
      and(T7, RET_REG)
    ),
    ENABLE_MR: or(
      T2,
      and(T5, MOV_IMM_REG),
      and(T5, MOV_MEM_REG), //w
      and(T6, MOV_MEM_REG), //w
      and(T5, MOV_REG_MEM),
      ////////////////////
      and(T5, JMP_IMM),
      and(T5, JZ_IMM), ////IF NO SKIPED
      and(T5, JNZ_IMM), ////IF NOT SKIPED
      and(T8, POP_REG),
      and(T8, RET_REG)
    ),
    WD: or(
      LOW, //?
      and(T6, MOV_REG_MEM),
      /////////////////
      and(T4, PUSH_REG),
      //////////////////
      and(T5, CALL_REG)
    ),
    MASK_HIGH: and(MASK_HIGH, not(T1), not(T2)),
    LOAD_SP: or(
      and(T6, PUSH_REG),
      and(T8, PUSH_REG),
      and(T4, POP_REG),
      and(T6, POP_REG, not(MASK_HIGH)),
      /////////////////

      and(T7, CALL_REG),
      and(T9, CALL_REG),
      and(T4, RET_REG),
      and(T6, RET_REG)
    ),
    ENABLE_SP: or(
      and(T3, PUSH_REG),
      and(T5, PUSH_REG),
      and(T7, PUSH_REG),
      and(T3, POP_REG),
      and(T5, POP_REG, not(MASK_HIGH)),
      and(T7, POP_REG),
      ///////////////////
      and(T4, CALL_REG),
      ////////////////////

      and(T6, CALL_REG),
      and(T8, CALL_REG),
      and(T3, RET_REG),
      and(T5, RET_REG),
      and(T7, RET_REG)
    ),
    ONE_AU: or(
      and(T3, INC),
      and(T3, DEC),
      and(T5, PUSH_REG),
      and(T7, PUSH_REG),
      and(T3, POP_REG),
      and(T5, POP_REG, not(MASK_HIGH)),
      ////////

      and(T6, CALL_REG),
      and(T8, CALL_REG),
      and(T3, RET_REG),
      and(T5, RET_REG)
    ),
  };

  return {
    controls,
    flip,
    intercept() {
      console.log("ring counter:");
      logWires([T1, T2, T3, T4, T5, T6, T7, T8]);
      console.log("controls");
      logWires(
        [
          RESET_RC,
          COUNT_RC,
          controls.ENABLE_PC,
          controls.LOAD_MAR,
          controls.ENABLE_MR,
          controls.LOAD_IR,
          controls.COUNT_PC,
          controls.LOAD_B,
          controls.ENABLE_B,
          controls.ENABLE_AU,
          controls.LOAD_AU,
          controls.ENABLE_SP,
          controls.LOAD_SP,
          controls.ONE_AU,
        ],
        [
          "RESET_RC",
          "COUNT_RC",
          "ENABLE_PC",
          "LOAD_MR",
          "ENABLE_MR",
          "LOAD_IR",
          "COUNT_PC",
          "lb",
          "eb",
          "enau",
          "ldau",
          "ensp",
          "ldsp",
          "oneau",
        ]
      );
      console.log("current instruct");
      logWires(instcode);
    },
  };
}
