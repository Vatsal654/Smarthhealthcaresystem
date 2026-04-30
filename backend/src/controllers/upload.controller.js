const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

exports.middleware = upload.single('file');

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

exports.handle = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('file is required');

  const folder = req.body.folder || 'shs/uploads';
  const result = await uploadBuffer(req.file.buffer, {
    folder,
    resource_type: 'auto',
    public_id: `${Date.now()}_${req.file.originalname.replace(/\W+/g, '_')}`,
  });

  res.json({
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    format: result.format || req.file.mimetype,
  });
});
