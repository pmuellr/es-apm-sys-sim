import { MidiMessage } from 'midi';
export { MidiMessage } from 'midi';

export type OnMessage = (deltaTime: number, message: MidiMessage) => void

export interface MidiPort {
  readonly name: string;
  close(): void
  sendMessage(bytes: number[]): void
}

export interface CreateMidiPortsParams {
  name: string
  onMessage: OnMessage
}

export interface Note {
  channel?:  number; // 1-16 grumble
  note?:     number; // 0 - 127
  velocity?: number; // 0 - 127
  length?:   number; // 0 - 127 (24 ppqn)
  offset?:   number; // -23 - 23 (24 ppqn)
}

