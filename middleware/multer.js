const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('../config/aws');
const path = require('path');

const ROOT_FOLDER = 'fivliaMarket';

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|svg|gif|webp|avif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) return cb(null, true);
  cb(new Error('Invalid file type'));
};

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,  // e.g. fivliaproject
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${file.fieldname}${ext}`;

      // ✅ no leading slash here
      cb(null, `${ROOT_FOLDER}/${file.fieldname}/${name}`);
    },
  }),
  fileFilter,
});

module.exports = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'MultipleImage', maxCount: 10 },
]);
