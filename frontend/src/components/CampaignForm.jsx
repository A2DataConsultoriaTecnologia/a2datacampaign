import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createCampaign } from '../services/api';
import styles from '../styles/CampaignForm.module.css';
import Cropper from 'react-easy-crop';

// Helper para gerar o "min" de datetime-local em horário local
function getLocalMinDateTime() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM   = pad(now.getMonth() + 1);
  const DD   = pad(now.getDate());
  const hh   = pad(now.getHours());
  const mm   = pad(now.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

// Helper para gerar imagem recortada
async function getCroppedImg(imageSrc, pixelCrop) {
  const createImage = url =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => resolve(img);
      img.onerror = error => reject(error);
      img.src = url;
    });

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg');
  });
}

export default function CampaignForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [numbersText, setNumbersText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importMode, setImportMode] = useState('manual'); // 'manual' ou 'csv'
  const csvFileInputRef = useRef(null);

  // Estado para única imagem
  const MAX_IMAGES = 1;
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const imageInputRef = useRef(null);

  // Estados de recorte
  const [croppingIndex, setCroppingIndex] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Gera previews
  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviews([]);
      return;
    }
    const previews = imageFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [imageFiles]);

  // Upload CSV/XLSX filtrando só dígitos
  const handleFileUpload = event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setError('Por favor, selecione um arquivo CSV ou XLSX válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const lines = e.target.result.split(/\r?\n/);
        const numbers = [];
        lines.forEach(line => {
          const digits = (line.match(/\d+/g) || []).join('');
          if (digits) numbers.push(`+${digits}`);
        });
        if (!numbers.length) {
          setError('Nenhum número válido encontrado no arquivo.');
          return;
        }
        setNumbersText(numbers.join('\n'));
        setSuccess(`${numbers.length} números importados com sucesso!`);
        setError(null);
      } catch {
        setError('Erro ao processar o arquivo.');
      }
    };
    reader.onerror = () => setError('Erro ao ler o arquivo.');
    reader.readAsText(file);
  };

  const clearFileInput = () => {
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    setNumbersText('');
    setError(null);
    setSuccess(null);
  };

  // Manipulação de imagens
  const handleClickSelectImages = () => {
    if (imageInputRef.current) imageInputRef.current.click();
  };
  const handleImageUpload = event => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const newValidFiles = [];
    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        setError('Apenas imagens JPEG, PNG ou WebP são permitidas.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Cada imagem deve ter no máximo 5MB.');
        return;
      }
      newValidFiles.push(file);
    });
    if (!newValidFiles.length) return;
    if (imageFiles.length >= MAX_IMAGES) {
      setError(`Você pode anexar no máximo ${MAX_IMAGES} imagem.`);
      return;
    }
    const fileToAdd = newValidFiles[0];
    setImageFiles(prev => [...prev, fileToAdd]);
    setError(null);
    setSuccess('Imagem selecionada com sucesso.');
    if (imageInputRef.current) imageInputRef.current.value = null;
  };
  const removeImageAtIndex = index => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setSuccess(null);
    setError(null);
  };
  const clearImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    if (imageInputRef.current) imageInputRef.current.value = null;
  };

  const handleStartCrop = index => {
    setCroppingIndex(index);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setShowCropModal(true);
  };
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  const handleConfirmCrop = async () => {
    if (croppingIndex === null || !croppedAreaPixels) {
      setShowCropModal(false);
      return;
    }
    try {
      const imageSrc = imagePreviews[croppingIndex];
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const oldFile = imageFiles[croppingIndex];
      const newFile = new File([blob], oldFile.name, { type: blob.type });
      setImageFiles(prev => {
        const arr = [...prev]; arr[croppingIndex] = newFile; return arr;
      });
      setSuccess('Imagem recortada com sucesso!');
    } catch {
      setError('Falha ao recortar imagem.');
    } finally {
      setShowCropModal(false);
      setCroppingIndex(null);
    }
  };
  const handleCancelCrop = () => setShowCropModal(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const rawList = numbersText.split(/\r?\n/).map(s => s.trim()).filter(s => s);
    if (!title || !message || !scheduledAt || !rawList.length) {
      setError('Preencha todos os campos corretamente.');
      return;
    }
    const selectedDate = new Date(scheduledAt);
    if (selectedDate <= new Date()) {
      setError('A data de agendamento deve ser no futuro.');
      return;
    }

    try {
      setLoading(true);
      let res;
      if (imageFiles.length) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('message', message);
        formData.append('scheduledAt', selectedDate.toISOString());
        formData.append('numbers', JSON.stringify(rawList));
        imageFiles.forEach(file => formData.append('images', file));
        res = await createCampaign(formData);
      } else {
        res = await createCampaign({ title, message, scheduledAt: selectedDate.toISOString(), numbers: rawList });
      }
      // reset
      setTitle(''); setMessage(''); setScheduledAt('');
      clearFileInput(); clearImages();
      setSuccess('Campanha criada com sucesso!');
      onCreated && onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formWrapper}>
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h2 className={styles.formTitle}>Nova Campanha WhatsApp</h2>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Título:</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={styles.input} disabled={loading} placeholder="Digite o título da campanha" required />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Mensagem:</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} className={styles.textarea} rows={4} disabled={loading} placeholder="Digite a mensagem que será enviada" required />
        </div>

        <div className={styles.imageAttachmentSection}>
          <label className={styles.imageAttachmentLabel}>Anexar imagens (opcional):</label>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} disabled={loading} className={styles.hiddenFileInput} />
          <div className={styles.imageButtonsContainer}>
            <button type="button" onClick={handleClickSelectImages} disabled={loading || imageFiles.length >= MAX_IMAGES} className={styles.attachButton}>
              <span className={styles.buttonIcon}>📎</span> Escolher Imagem
            </button>
          </div>
          {imageFiles.length > 0 && <div className={styles.imageCounter}>{imageFiles.length}/{MAX_IMAGES}</div>}
          <small className={styles.helpText}>Você pode anexar até {MAX_IMAGES} imagem (JPEG/PNG/WebP), até 5MB.</small>
          {imagePreviews.length > 0 && (
            <div className={styles.imagePreviewContainer}>
              {imagePreviews.map((url, idx) => (
                <div key={idx} className={styles.imagePreviewItem}>
                  <img src={url} alt={`Preview ${idx+1}`} className={styles.imagePreview} />
                  <div className={styles.previewOverlay}>
                    <button type="button" onClick={() => handleStartCrop(idx)} disabled={loading} className={styles.cropOverlayButton}>✂️</button>
                    <button type="button" onClick={() => removeImageAtIndex(idx)} disabled={loading} className={styles.removeImageButton}>✖</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={clearImages} disabled={loading} className={styles.clearAllImagesButton}>Limpar imagem</button>
            </div>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Data e hora de envio:</label>
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className={styles.input} disabled={loading} min={getLocalMinDateTime()} required />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Como deseja adicionar os números?</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}><input type="radio" value="manual" checked={importMode==='manual'} onChange={e=>setImportMode(e.target.value)} disabled={loading} /> <span className={styles.radioText}>Digitação manual</span></label>
            <label className={styles.radioLabel}><input type="radio" value="csv" checked={importMode==='csv'} onChange={e=>setImportMode(e.target.value)} disabled={loading} /> <span className={styles.radioText}>Importar arquivo CSV/XLSX</span></label>
          </div>
        </div>
        {importMode==='manual' ? (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Números de WhatsApp (um por linha):</label>
            <textarea value={numbersText} onChange={e=>setNumbersText(e.target.value)} className={styles.textarea} rows={4} disabled={loading} placeholder="558398633059" required />
          </div>
        ) : (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Arquivo CSV/XLSX:</label>
            <div className={styles.fileInputWrapper}>
              <input ref={csvFileInputRef} type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className={styles.fileInput} disabled={loading} id="csvFile" />
              <label htmlFor="csvFile" className={styles.fileLabel}>Escolher arquivo</label>
              <a href="/template.csv" download className={styles.templateLink}>
                <span className={styles.downloadIcon}>⬇️</span>
                Baixar modelo
              </a>
              {numbersText && <button type="button" onClick={clearFileInput} className={styles.clearButton} disabled={loading}>Limpar</button>}
            </div>
            <small className={styles.helpText}>Cada linha deve conter apenas os dígitos do telefone (ex: 558398633059).</small>
            {numbersText && (
              <div className={styles.previewSection}>
                <label className={styles.label}>Números importados:</label>
                <textarea value={numbersText} onChange={e=>setNumbersText(e.target.value)} className={styles.textarea} rows={4} disabled={loading} />
              </div>
            )}
          </div>
        )}

        {error && <div className={styles.messageBox}><p className={styles.errorMessage}>❌ {error}</p></div>}
        {success && <div className={styles.messageBox}><p className={styles.successMessage}>✅ {success}</p></div>}

        <button type="submit" disabled={loading} className={styles.submitButton}>{loading ? 'Criando campanha...' : 'Criar Campanha'}</button>
      </form>

      {showCropModal && croppingIndex!==null && (
        <div className={styles.cropModalOverlay}>
          <div className={styles.cropModalContent}>
            <h3 className={styles.cropModalTitle}>Recortar Imagem</h3>
            <div className={styles.cropContainer}>
              <Cropper image={imagePreviews[croppingIndex]} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
            <div className={styles.cropControls}>
              <label className={styles.zoomLabel}>Zoom:</label>
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e=>setZoom(Number(e.target.value))} className={styles.zoomRange} />
            </div>
            <div className={styles.cropButtons}>
              <button type="button" onClick={handleConfirmCrop} className={styles.confirmCropButton}>Confirmar</button>
              <button type="button" onClick={handleCancelCrop} className={styles.cancelCropButton}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}