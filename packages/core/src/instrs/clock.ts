import { ClockSource, Flippable, WireState } from "./types";

export class NormalClock implements ClockSource, Flippable {
  private ticktocks: Flippable[] = [];

  willFlip(tick: Flippable) {
    this.ticktocks.push(tick);
  }

  flip(to: WireState) {
    const tocks = this.ticktocks.map((x) => x.flip(to));
    return () => tocks.forEach((x) => x());
  }

  tick() {
    this.flip(WireState.HIGH)();
    this.flip(WireState.LOW)();
  }
}
