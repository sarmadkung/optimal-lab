// A readable stream pauses the producer once the buffer reaches the high water mark,
// then resumes after the consumer drains it back under that mark.

export type PressureFrame = {
  tick: number;
  wrote: number;
  read: number;
  buffer: number;
  paused: boolean;
};

export function simulate(produce: number, consume: number, hwm: number, ticks = 8): PressureFrame[] {
  const frames: PressureFrame[] = [];
  let buffer = 0;
  let paused = false;
  for (let tick = 0; tick < ticks; tick++) {
    let wrote = 0;
    if (!paused) {
      wrote = produce;
      buffer += produce;
      if (buffer >= hwm) paused = true;
    }
    const read = Math.min(buffer, consume);
    buffer -= read;
    if (paused && buffer < hwm) paused = false;
    frames.push({ tick, wrote, read, buffer, paused });
  }
  return frames;
}
