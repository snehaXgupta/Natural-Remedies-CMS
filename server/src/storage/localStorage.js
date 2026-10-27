import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import env from '../config/env.js';

export class LocalStorage {
  constructor(baseDir = env.STORAGE_DIR) {
    this.baseDir = path.resolve(baseDir);
  }

  resolvePath(key) {
    const fullPath = path.resolve(this.baseDir, key);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error('Path traversal detected');
    }
    return fullPath;
  }

  async put(key, buffer) {
    const fullPath = this.resolvePath(key);
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, buffer);
  }

  async stream(key) {
    const fullPath = this.resolvePath(key);
    await fsp.access(fullPath, fs.constants.R_OK);
    return fs.createReadStream(fullPath);
  }

  async remove(key) {
    const fullPath = this.resolvePath(key);
    try {
      await fsp.unlink(fullPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}
