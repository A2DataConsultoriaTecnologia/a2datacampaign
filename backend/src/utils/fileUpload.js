// backend/src/utils/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Diretório de uploads: <project_root>/uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de storage: grava em disco em `uploads/`, nome único
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    // Gera nome único: campo + timestamp + random + extensão
    const safeName = `${file.fieldname}-${timestamp}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, safeName);
  }
});

// Filtro de tipo de arquivo: permitir apenas imagens
function fileFilter(req, file, cb) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas JPEG, PNG ou WebP.'), false);
  }
}

// Limites de tamanho
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
};

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
