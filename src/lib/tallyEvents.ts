import { EventEmitter } from 'events';

// Global Tally Event Emitter pattern for Next.js hot-reloads
const globalForTallyEvents = globalThis as unknown as {
  tallyEventEmitter?: EventEmitter;
};

export const tallyEventEmitter =
  globalForTallyEvents.tallyEventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForTallyEvents.tallyEventEmitter = tallyEventEmitter;
}

export function broadcastTallyEvent(event: string, data: any) {
  tallyEventEmitter.emit(event, data);
  tallyEventEmitter.emit('all', { event, data });
}
