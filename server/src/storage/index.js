import env from '../config/env.js';
import { LocalStorage } from './localStorage.js';

let instance = null;

export function storage() {
  if (!instance) {
    if (env.STORAGE_DRIVER === 'local') {
      instance = new LocalStorage(env.STORAGE_DIR);
    } else {
      throw new Error(`Unsupported storage driver: ${env.STORAGE_DRIVER}`);
    }
  }
  return instance;
}
