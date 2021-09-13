import { prototype1 } from "../../core/src";
import { oneTick } from "../../core/src/instrs/flipflop";

const go = prototype1(
//   new Uint8Array([
//     0b001000,
//     0b00100000,
//     0xfd,
//     0x7, // MOV B, 0x7fd
//     0b001001,
//     0b00010010, // MOV A,B
//     0b001010,
//     0b00100000, // MOV B, [0x05]
//     0x05,
//     0x0, // imm: 0x05 (address)
//     0x8f,
//     0x10, // constant 0x108f
//   ])
new Uint8Array([
        0b001000,
        0b00100000,
        0xfd,
        0x7, // MOV B, 0x7fd
        0b001001,
        0b00010010, // MOV A,B
        // 0b001011,
        // 0b00000010, // MOV [0x05], B
        // 0x05,
        // 0x0, // imm: 0x05 (address)
        // 0x8f,
        // 0x10, // constant 0x108f
        // 0b00001111,0x0 // <- halt
        0b000101,0b00010010 // ADD, to A
      ])
);
go.intercept();

oneTick(go);
go.intercept();
oneTick(go);
go.intercept();

(window as any).tick = () => {
  oneTick(go);
  go.intercept();
};
