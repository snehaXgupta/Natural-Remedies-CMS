import env from '../config/env.js';
import { MongoGridFSStorage } from './mongoGridFSStorage.js';

let instance = null;

export function storage() {
  if (!instance) {
    instance = new MongoGridFSStorage(env.STORAGE_DIR);
  }
  return instance;
}
