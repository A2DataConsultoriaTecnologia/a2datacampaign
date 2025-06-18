// backend/src/services/zapiService.js
console.log('ZAPI URLs:', ZAPI_URL_TEXT, ZAPI_URL_IMAGE);
const axios = require('axios');
require('dotenv').config();

const ZAPI_URL_TEXT = process.env.ZAPI_URL_TEXT || process.env.ZAPI_URL;
let ZAPI_URL_IMAGE = process.env.ZAPI_URL_IMAGE;
if (!ZAPI_URL_IMAGE && ZAPI_URL_TEXT) {
  // Tenta derivar trocando 'send-text' por 'send-image' na URL, se aplicável
  ZAPI_URL_IMAGE = ZAPI_URL_TEXT.replace(/send-text/, 'send-image');
}

const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

if (!CLIENT_TOKEN) {
  console.warn('⚠️ Atenção: ZAPI_CLIENT_TOKEN não está definido em .env');
} else {
  console.log('ZAPI_CLIENT_TOKEN carregado com sucesso');
}

async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    let phone = phoneNumber;
    if (phone.startsWith('+')) {
      phone = phone.slice(1);
    }
    const payload = {
      phone: phone,
      message: message
    };
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN
    };
    if (!ZAPI_URL_TEXT) {
      throw new Error('ZAPI_URL_TEXT não configurado');
    }
    const response = await axios.post(ZAPI_URL_TEXT, payload, {
      headers,
      timeout: 30000,
    });
    console.log('Resposta Z-API text:', response.data);
    if (response.data && (response.data.success === true || response.status === 200)) {
      return { success: true, data: response.data };
    } else {
      return { success: false, data: response.data };
    }
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error(`Erro ao enviar mensagem p/ ${phoneNumber}:`, errData);
    return { success: false, error: errData };
  }
}

// Envia imagem em Base64 ou URL pública
// phoneNumber: string, ex "+5511999999999"
// base64Image: string começando com "data:image/...;base64,...."
// caption: legenda opcional
async function sendWhatsAppImage(phoneNumber, base64Image, caption = '') {
  try {
    let phone = phoneNumber;
    if (phone.startsWith('+')) {
      phone = phone.slice(1);
    }
    const payload = {
      phone: phone,
      image: base64Image,   // data URI
    };
    if (caption) {
      payload.caption = caption;
    }
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN
    };
    if (!ZAPI_URL_IMAGE) {
      throw new Error('ZAPI_URL_IMAGE não configurado');
    }
    const response = await axios.post(ZAPI_URL_IMAGE, payload, {
      headers,
      timeout: 60000, // timeout maior para imagem
    });
    console.log('Resposta Z-API image:', response.data);
    if (response.data && (response.data.success === true || response.status === 200)) {
      return { success: true, data: response.data };
    } else {
      return { success: false, data: response.data };
    }
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error(`Erro ao enviar imagem p/ ${phoneNumber}:`, errData);
    return { success: false, error: errData };
  }
}

module.exports = { sendWhatsAppMessage, sendWhatsAppImage };
