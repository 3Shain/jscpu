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
