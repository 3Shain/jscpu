export const enum WireState {
  HIGH = 0b11,
  LOW = 0b10,
  HiZ = 0b00,
}

export type SampleWire = () => WireState;

export interface Flippable {
  flip(goes: WireState): () => void; // it's the real side effect
}

export interface Settable {
  set(): void;
  reset(): void;
}

export interface ClockSource {
  willFlip(flippable: Flippable): void;
}
