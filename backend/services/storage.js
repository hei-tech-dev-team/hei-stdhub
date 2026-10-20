const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const ALLOWED_MIMES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
]);

const useCloudinary = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
].every((k) => process.env[k]?.trim());

if (useCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
        api_key: process.env.CLOUDINARY_API_KEY.trim(),
        api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    });
} else {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    console.warn("[storage] provider: disque local (Cloudinary non configuré)");
    if (process.env.NODE_ENV === "production") {
        console.error("[storage] ATTENTION : stockage local en production (fichiers éphémères)");
    }
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
        cb(new Error("Type de fichier non autorisé."));
    },
});

function wrap(handler) {
    return (req, res, next) => {
        handler(req, res, (err) => {
        if (!err) return next();
        const message =
            err.code === "LIMIT_FILE_SIZE"
            ? "Fichier trop volumineux (10 Mo max)."
            : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
                ? `Trop de fichiers (${MAX_FILES} max).`
                : err.message;
        res.status(400).json({ error: message });
        });
    };
}

const single = (field = "file") => wrap(upload.single(field));
const many = (field = "files", max = MAX_FILES) => wrap(upload.array(field, max));

async function saveFile(file, folder) {
    const isImage = file.mimetype.startsWith("image/");
    const base = {
        isImage,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
    };

    if (useCloudinary) {
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    { folder: `hei-stdhub/${folder}`, resource_type: "auto" },
                    (err, res) => (err ? reject(err) : resolve(res)),
                )
                .end(file.buffer);
        });
        return {
            ...base,
            url: result.secure_url,
            key: result.public_id,
            resourceType: result.resource_type,
        };
    }

    const ext = path.extname(file.originalname) || "";
    const name = crypto.randomBytes(16).toString("hex") + ext;
    const dir = path.join(UPLOAD_ROOT, folder);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, name), file.buffer);
    const key = `${folder}/${name}`;
    return {
        ...base,
        url: `${process.env.PUBLIC_API_URL || ""}/uploads/${key}`,
        key,
        resourceType: isImage ? "image" : "raw",
    };
}

async function removeFile(key, resourceType = "image") {
    if (!key) return;
    try {
        if (useCloudinary) {
            await cloudinary.uploader.destroy(key, { resource_type: resourceType });
        } else {
            const target = path.resolve(UPLOAD_ROOT, key);
            if (!target.startsWith(UPLOAD_ROOT + path.sep)) return;
            await fs.promises.unlink(target);
        }
    } catch (e) {
        console.warn("[storage] removeFile:", e.message);
    }
}

module.exports = { single, many, saveFile, removeFile };