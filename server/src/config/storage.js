/**
 * Storage adapter — GridFS implementation.
 *
 * Everything else in the app talks to saveFile / getFileStream / deleteFile.
 * To move to Cloudinary/S3 later, rewrite ONLY this file, keep the signatures.
 */
import mongoose from "mongoose";
import { Readable } from "stream";

const BUCKET = "documents";

const bucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET,
  });

/**
 * @param {Buffer} buffer
 * @param {{ filename: string, mimetype: string, metadata: object }} opts
 * @returns {Promise<{ fileId: string, size: number }>}
 */
export const saveFile = (buffer, { filename, mimetype, metadata = {} }) =>
  new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(filename, {
      contentType: mimetype,
      metadata,
    });
    Readable.from(buffer)
      .pipe(stream)
      .on("error", reject)
      .on("finish", () =>
        resolve({ fileId: stream.id.toString(), size: stream.length })
      );
  });

export const getFileStream = async (fileId) => {
  const _id = new mongoose.Types.ObjectId(fileId);
  const files = await bucket().find({ _id }).toArray();
  if (!files.length) return null;
  return { file: files[0], stream: bucket().openDownloadStream(_id) };
};

export const deleteFile = async (fileId) => {
  try {
    await bucket().delete(new mongoose.Types.ObjectId(fileId));
  } catch (err) {
    if (!/FileNotFound/.test(err.message)) throw err;
  }
};

/** Total bytes used by uploaded documents — for the storage meter on the dashboard. */
export const storageUsed = async () => {
  const res = await mongoose.connection.db
    .collection(`${BUCKET}.files`)
    .aggregate([{ $group: { _id: null, bytes: { $sum: "$length" }, count: { $sum: 1 } } }])
    .toArray();
  return res[0] || { bytes: 0, count: 0 };
};
