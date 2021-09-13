import { suite } from "uvu";
import { HIGH, LOW } from "../src/instrs/wire";
import { generalRegister } from "../src/instrs/register";
import { WireState } from "../src/instrs/types";
import { logWires } from "../src/shared";

const test = suite("register");

test("shoud work", () => {
  const register = generalRegister(
    {
      LD: LOW,
      SHR: LOW,
      SHL: LOW,
      RTR: LOW,
      RTL: LOW,
      D: [LOW, LOW, LOW, LOW, LOW, LOW, LOW, LOW],
      EN: HIGH,
    },
    { size: 8 }
  );

  logWires(register.TRI_STATE_OUT);

  register.set(0b01101000);

  logWires(register.TRI_STATE_OUT);

  register.flip(WireState.HIGH)();
  register.flip(WireState.LOW)();
  logWires(register.TRI_STATE_OUT);
  register.flip(WireState.HIGH)();
  register.flip(WireState.LOW)();
  logWires(register.TRI_STATE_OUT);
  register.flip(WireState.HIGH)();
  register.flip(WireState.LOW)();
  logWires(register.TRI_STATE_OUT);
  register.flip(WireState.HIGH)();
  register.flip(WireState.LOW)();
  logWires(register.TRI_STATE_OUT);
  register.flip(WireState.HIGH)();
  register.flip(WireState.LOW)();
  logWires(register.TRI_STATE_OUT);
  register.flip(WireState.HIGH)();
  register.flip(WireState.LOW)();
  logWires(register.TRI_STATE_OUT);
});

test.run();
