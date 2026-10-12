import { EventEmitter } from 'events';

// Create a global event emitter for notifications and data updates
const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(100);

export const UpdatesEmitter = {
  subscribe(callback: (type: 'jobs' | 'notifications' | 'partRequests' | 'stats') => void) {
    const handler = (type: 'jobs' | 'notifications' | 'partRequests' | 'stats') => callback(type);
    eventEmitter.on('update', handler);
    return () => {
      eventEmitter.off('update', handler);
    };
  },
  
  publish(type: 'jobs' | 'notifications' | 'partRequests' | 'stats') {
    eventEmitter.emit('update', type);
  }
};
