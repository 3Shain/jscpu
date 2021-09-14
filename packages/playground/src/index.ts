import { prototype1 } from "../../core/src";
import { oneTick } from "../../core/src/instrs/flipflop";

const program = new Uint8Array([
  // mov a 0
  // push a
  // push a
  // 0b11100,
  // 0b00000001,
  0b1000,
  0b00100000,12,0,
  // -> call fib
  // mov c, [fib]
  0b1000,
  0b00110000,
  0,
  1,
  // call c
  0b11000,
  0b00000011,
  //pop a
  0b11101,
  0b00010000,

  0b001011,
  0b00000010, // MOV [0x2e], A
  0x2e,
  0x0, // imm: 0x2e (address)
  0b1111,
  // 0b10001000,
  // 0b00100000,
  // 0xfd,
  // // 0x7, // MOV B, 0x7fd
  // 0b00010100,
  // 7,
  // 0,
  // 0b11011,
  // 0b001001,
  // 0b00010010, // MOV A,B
  // // 0b001011,
  // // 0b00000010, // MOV [0x05], B
  // // 0x05,
  // // 0x0, // imm: 0x05 (address)
  // // 0x8f,
  // // 0x10, // constant 0x108f
  // // 0b00001111,0x0 // <- halt
  // // 0b000101,
  // // 0b00010010, // ADD, to A
  // // 0b1100,
  // // 0b00100010,
  // // 0b1100,
  // // 0b00100010,

  // // 0b001011,
  // // 0b00000010, // MOV [0x05], B
  // // 0x2e,
  // // 0x0, // imm: 0x05 (address)

  // 0b100,
  // 0b00010001, // ADD A<-A

  // 0b10110,
  // 7,
  // 0, // JNZ 0x7

  // 0b001000,
  // 0b00010000,
  // 0x00,
  // 0x01, // MOV A, 0x100

  // 0b11000,
  // 0b00000001, // CALL A

  // 0b1100,
  // 0b00100010,
  // 0b1100,
  // 0b00100010,
  // 0b1100,
  // 0b00100010,
  // 0b10100,
  // 9,
  // 0,
  ...new Array(0x200).fill(0),
]);

// // program
// program.set(
//   new Uint8Array([0b00011100, 0b00000010, 0b00011101, 0b00010000, 0b011001]),
//   0x100
// );

const fib = new Uint8Array([

  // mov a<-b
  0b1001,0b00010010,
  // add a<- d
  0b100, 0b00010100,
  // jnz: positive,
  0b10111, 10, 1,
  // mov b<-a
  0b1001,0b00100001, 
  // ret
  0b11001,
  // positive:
  // dec a
  0b1101, 0b00010001,
  // jnz: still positive
  0b10111, 20, 1,
  // inc a
  0b1100, 0b00010001,
  // mov b<-a
  0b1001,0b00100001,
  // ret
  0b11001,
  // still positive
  // push a
  0b11100, 0b00000001, // store the value
  // mov b<-a
  0b1001,0b00100001,
  // mov c, [fib]
  0b1000, 0b00110000, 0, 1,
  // call c
  0b11000, 0b00000011,
  // pop a
  0b11101, 0b00010000,
  // push b 
  0b11100,0b00000010,
  // dec a
  0b1101, 0b00010001,
  // mov b<-a
  0b1001,0b00100001,
  // -> call fib
  // mov c, [fib]
  0b1000, 0b00110000, 0, 1,
  // call c
  0b11000, 0b00000011,
  // pop a
  0b11101, 0b00010000,
  // add a<-b
  0b100, 0b00010010,
  // mov b<-a
  0b1001,0b00100001,
  // ret
  0b11001,
]);

// program
program.set(fib, 0x100);

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
  program
);
go.intercept();

// oneTick(go);
// go.intercept();
// oneTick(go);
// go.intercept();

(window as any).tick = () => {
  oneTick(go);
  go.intercept();
};

let lastlog = performance.now();
let freq = 0;
let freq2 = 0;

function startCounter(fn: () => void) {
  const channel = new MessageChannel();
  let start = false;
  channel.port2.onmessage = () => {
    if (!start) {
      return;
    }
    fn();
    const g = performance.now();
    if (g - lastlog > 1000) {
      freq2 = freq;
      freq = 0;
      lastlog = g;
    } else {
      freq++;
    }
    channel.port1.postMessage(undefined);
  };
  return {
    start() {
      start = true;
      channel.port1.postMessage(undefined);
    },
  };
}

startCounter(() => oneTick(go)).start();

function dumpMemory(mem: Uint8Array[], start: number, end: number) {
  let str = "";
  for (let i = start / 2; i < end / 2; i++) {
    str += toHex(mem[0][i]) + " " + toHex(mem[1][i]) + " ";
  }
  return str;
}

function toHex(num: number) {
  const out = num.toString(16);
  return out.length === 1 ? `0x0${out}` : `0x${out}`;
}

const memDump = document.querySelector("#mem-dump") as HTMLDivElement;
const status = document.querySelector("#status") as HTMLDivElement;

function startDump() {
  function dump() {
    memDump.innerText =
      dumpMemory(go.MEM, 0, 0x10) +
      "\n" +
      dumpMemory(go.MEM, 0x10, 0x20) +
      "\n" +
      dumpMemory(go.MEM, 0x20, 0x30) +
      "\n" +
      dumpMemory(go.MEM, 0x30, 0x40);
    status.innerText = `frequency: ${freq2}Hz`;
    requestAnimationFrame(dump);
  }
  requestAnimationFrame(dump);
}

startDump();
