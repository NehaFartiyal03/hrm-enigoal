import sharp from "sharp";

/**
 * Storage is capped at 512 MB on Atlas free tier, so images are
 * downscaled and re-encoded before they ever reach GridFS.
 * PDFs pass through untouched.
 */
export const compressIfImage = async (file) => {
  if (!file.mimetype.startsWith("image/")) return file;

  const buffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  return {
    ...file,
    buffer,
    mimetype: "image/jpeg",
    size: buffer.length,
    originalname: file.originalname.replace(/\.[^.]+$/, "") + ".jpg",
  };
};

/**
 * Employee photos are printed on ID cards, so they are stored large enough to
 * stay sharp at 300 dpi (a 30 mm-wide card photo needs ~360 px; 900 px leaves
 * room for the portrait crop and the 4x html2canvas export). Still only
 * ~120 KB per employee, which is nothing against the 512 MB cap.
 */
export const compressAvatar = async (buffer) =>
  sharp(buffer)
    .rotate()
    .resize(900, 1100, { fit: "cover", position: "top" })
    .sharpen()
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
