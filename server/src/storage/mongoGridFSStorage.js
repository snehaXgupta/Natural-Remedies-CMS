import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import stream from 'node:stream';
import mongoose from 'mongoose';
import env from '../config/env.js';
import logger from '../config/logger.js';

export class MongoGridFSStorage {
  constructor(baseDir = env.STORAGE_DIR) {
    this.baseDir = path.resolve(baseDir);
    this._bucket = null;
  }

  get bucket() {
    if (!this._bucket && mongoose.connection.readyState === 1 && mongoose.connection.db) {
      this._bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'attachments',
      });
    }
    return this._bucket;
  }

  resolvePath(key) {
    const fullPath = path.resolve(this.baseDir, key);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error('Path traversal detected');
    }
    return fullPath;
  }

  async put(key, buffer, options = {}) {
    // 1. Write to local disk cache
    try {
      const fullPath = this.resolvePath(key);
      await fsp.mkdir(path.dirname(fullPath), { recursive: true });
      await fsp.writeFile(fullPath, buffer);
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Local storage write warning, relying on GridFS');
    }

    // 2. Write to MongoDB GridFS for permanent persistence across restarts
    if (this.bucket) {
      try {
        const uploadStream = this.bucket.openUploadStream(key, {
          contentType: options.contentType,
        });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        await new Promise((resolve, reject) => {
          bufferStream.pipe(uploadStream)
            .on('finish', resolve)
            .on('error', reject);
        });
      } catch (gridErr) {
        logger.warn({ err: gridErr.message, key }, 'GridFS write failed');
      }
    }
  }

  async stream(key) {
    // 1. Try local disk cache first
    try {
      const fullPath = this.resolvePath(key);
      await fsp.access(fullPath, fs.constants.R_OK);
      return fs.createReadStream(fullPath);
    } catch (diskErr) {
      // Local file not on disk (e.g. Render restart/redeploy) -> Fallback to permanent GridFS
      if (this.bucket) {
        try {
          const files = await this.bucket.find({ filename: key }).limit(1).toArray();
          if (files.length > 0) {
            const downloadStream = this.bucket.openDownloadStreamByName(key);
            // Re-cache to local disk in background for performance
            const fullPath = this.resolvePath(key);
            fsp.mkdir(path.dirname(fullPath), { recursive: true })
              .then(() => {
                const writeStream = fs.createWriteStream(fullPath);
                this.bucket.openDownloadStreamByName(key).pipe(writeStream);
              })
              .catch(() => {});
            return downloadStream;
          }
        } catch (gridErr) {
          logger.warn({ err: gridErr.message, key }, 'GridFS stream lookup failed');
        }
      }
      throw diskErr;
    }
  }

  async remove(key) {
    // 1. Remove from local disk
    try {
      const fullPath = this.resolvePath(key);
      await fsp.unlink(fullPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    // 2. Remove from GridFS
    if (this.bucket) {
      try {
        const files = await this.bucket.find({ filename: key }).toArray();
        for (const file of files) {
          await this.bucket.delete(file._id);
        }
      } catch (gridErr) {
        logger.warn({ err: gridErr.message, key }, 'GridFS remove failed');
      }
    }
  }
}

