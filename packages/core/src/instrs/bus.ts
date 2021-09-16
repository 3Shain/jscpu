import { WireState } from "./types";
import { forward, HIZ, joint, lift, Wire } from "./wire";

export class Bus {
  private current: Wire[];
  public readonly WIRES: Wire[];
  constructor(public readonly width: number) {
    this.current = new Array(width).fill(HIZ);
    this.WIRES = this.current.map((_, i) => forward(() => this.current[i]));
  }

  joint(wires: Wire[]) {
    this.current = lift(joint, this.current, wires);
    return this;
  }
}

export class BusS {
  private current: Wire;
  public readonly BUS: Wire;
  public readonly WIRES: Wire[];

  constructor(public readonly width: number) {
    this.current = new Wire(() => {
      let ret = 0;
      for (let i = 0; i < width; i++) {
        ret |= WireState.HiZ << (i * 2);
      }
      return ret;
    }); // start with constant
    this.BUS = forward(() => this.current);
    this.WIRES = busToWires(this.BUS, width);
  }

  jointBus(wires: Wire) {
    this.current = joint(this.current, wires);
    return this;
  }

  joint(wires: Wire[]) {
    this.current = joint(this.current, wiresToBus(wires));
    return this;
  }
}

function wiresToBus(wires: Wire[]) {
  return new Wire(() => {
    let ret = 0;
    for (let i = 0; i < wires.length; i++) {
      ret |= wires[i].sample() << (i * 2);
    }
    return ret;
  });
}

function busToWires(bus: Wire, width: number) {
  return new Array(width).fill(null).map((_, i) => {
    return new Wire(() => {
      return (bus.sample() >> (i * 2)) & 0b11;
    });
  });
}
