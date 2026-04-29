const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = req.body.folder || 'shs/uploads';
    return {
      folder,
      resource_type: 'auto',
      public_id: `${Date.now()}_${file.originalname.replace(/\W+/g, '_')}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

exports.middleware = upload.single('file');

exports.handle = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('file is required');
  res.json({
    url: req.file.path,
    publicId: req.file.filename,
    bytes: req.file.size,
    format: req.file.mimetype,
  });
});
