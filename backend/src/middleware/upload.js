const multer = require('multer');
const path = require('path');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter for audio files
const audioFileFilter = (req, file, cb) => {
  const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'), false);
  }
};

// File filter for notation files (MusicXML, PDF, and images for transposition questions)
// Note: This is a general filter - specific validation should be done in the route handler
const notationFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/xml',
    'text/xml',
    'application/vnd.recordare.musicxml+xml',
    'application/vnd.recordare.musicxml',
    'application/zip', // For .mxl files
    'application/x-zip-compressed',
    // Image types
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  const allowedExts = ['.pdf', '.xml', '.musicxml', '.mxl', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MusicXML, PDF, or image files are allowed.'), false);
  }
};

// File filter for student submissions
const submissionFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/xml',
    'text/xml',
    'application/vnd.recordare.musicxml+xml',
    'application/vnd.recordare.musicxml',
    'image/png',
    'image/jpeg'
  ];
  
  const allowedExts = ['.pdf', '.xml', '.musicxml', '.mxl', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type for submission.'), false);
  }
};

// Upload middleware configurations
const uploadAudio = multer({
  storage: storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
}).single('audioFile');

const uploadNotation = multer({
  storage: storage,
  fileFilter: notationFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('notationFile');

const uploadSubmission = multer({
  storage: storage,
  fileFilter: submissionFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
}).single('submissionFile');

const uploadImage = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file type.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('image');

// Error handling wrapper
const handleUploadError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large'
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadAudio: handleUploadError(uploadAudio),
  uploadNotation: handleUploadError(uploadNotation),
  uploadSubmission: handleUploadError(uploadSubmission),
  uploadImage: handleUploadError(uploadImage)
};

