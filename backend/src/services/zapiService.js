// backend/src/services/zapiService.js
require('dotenv').config();
const axios = require('axios');

const ZAPI_URL_TEXT = process.env.ZAPI_URL_TEXT || process.env.ZAPI_URL;
let ZAPI_URL_IMAGE = process.env.ZAPI_URL_IMAGE;

if (!ZAPI_URL_IMAGE && ZAPI_URL_TEXT) {
  // Tenta derivar a URL da imagem a partir da de texto
  ZAPI_URL_IMAGE = ZAPI_URL_TEXT.replace(/send-text/, 'send-image');
}

const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

if (!CLIENT_TOKEN) {
  console.warn('⚠️ Atenção: ZAPI_CLIENT_TOKEN não está definido em .env');
} else {
  console.log('ZAPI_CLIENT_TOKEN carregado com sucesso');
  console.log('ZAPI URLs:', ZAPI_URL_TEXT, ZAPI_URL_IMAGE);
}

async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const phone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    const payload = {
      phone,
      message
    };
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN
    };
    if (!ZAPI_URL_TEXT) throw new Error('ZAPI_URL_TEXT não configurado');

    const response = await axios.post(ZAPI_URL_TEXT, payload, { headers, timeout: 30000 });
    console.log('Resposta Z-API text:', response.data);

    return {
      success: response.data?.success === true || response.status === 200,
      data: response.data
    };
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error(`Erro ao enviar mensagem p/ ${phoneNumber}:`, errData);
    return { success: false, error: errData };
  }
}

async function sendWhatsAppImage(phoneNumber, base64Image, caption = '') {
  try {
    const phone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    const payload = {
      phone,
      image: base64Image,
      caption
    };
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN
    };
    if (!ZAPI_URL_IMAGE) throw new Error('ZAPI_URL_IMAGE não configurado');

    const response = await axios.post(ZAPI_URL_IMAGE, payload, { headers, timeout: 60000 });
    console.log('Resposta Z-API image:', response.data);

    return {
      success: response.data?.success === true || response.status === 200,
      data: response.data
    };
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error(`Erro ao enviar imagem p/ ${phoneNumber}:`, errData);
    return { success: false, error: errData };
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppImage
};
