const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { AppError } = require('../../utils/errors');

const publicUploadBase = '/uploads/events';
const uploadDirectory = path.join(__dirname, '../../../uploads/events');
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function ensureUploadDirectory() {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

function sanitizeFileName(filename) {
  const baseName = path.parse(filename).name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return baseName || 'event-image';
}

function getSafeExtension(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.has(extension)) return extension;

  if (file.mimetype === 'image/jpeg') return '.jpg';
  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  if (file.mimetype === 'image/gif') return '.gif';

  return '';
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    ensureUploadDirectory();
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${sanitizeFileName(file.originalname)}-${uniqueSuffix}${getSafeExtension(file)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new AppError('Chỉ hỗ trợ file ảnh JPG, PNG, WEBP hoặc GIF', 400));
      return;
    }

    callback(null, true);
  }
});

const eventImageFields = upload.fields([
  { name: 'banner', maxCount: 1 },
  { name: 'seatingChart', maxCount: 1 },
  { name: 'seating_chart', maxCount: 1 }
]);

function uploadEventImages(req, res, next) {
  eventImageFields(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'File ảnh không được vượt quá 5MB'
        : err.message;
      next(new AppError(message, 400));
      return;
    }

    next(err);
  });
}

function eventImageUrl(file) {
  return file ? `${publicUploadBase}/${file.filename}` : undefined;
}

module.exports = {
  uploadEventImages,
  eventImageUrl
};
