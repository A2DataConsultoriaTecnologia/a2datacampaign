require('dotenv').config();
const axios = require('axios');

// URLs da Z-API (texto e imagem)
const ZAPI_URL_TEXT = process.env.ZAPI_URL_TEXT || process.env.ZAPI_URL;
let ZAPI_URL_IMAGE = process.env.ZAPI_URL_IMAGE;
if (!ZAPI_URL_IMAGE && ZAPI_URL_TEXT) {
  ZAPI_URL_IMAGE = ZAPI_URL_TEXT.replace(/send-text/, 'send-image');
}

// Debug: mostre as URLs carregadas
console.log('ZAPI URLs:', ZAPI_URL_TEXT, ZAPI_URL_IMAGE);

// Token do cliente Z-API
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
if (!CLIENT_TOKEN) {
  console.warn('⚠️ Atenção: ZAPI_CLIENT_TOKEN não está definido em .env');
} else {
  console.log('ZAPI_CLIENT_TOKEN carregado com sucesso');
}

// Envia texto via Z-API
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    let phone = phoneNumber;
    if (phone.startsWith('+')) phone = phone.slice(1);

    const payload = { phone, message };
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN
    };
    if (!ZAPI_URL_TEXT) throw new Error('ZAPI_URL_TEXT não configurado');

    const response = await axios.post(ZAPI_URL_TEXT, payload, { headers, timeout: 30000 });
    console.log('Resposta Z-API text:', response.data);
    if (response.data && (response.data.success === true || response.status === 200)) {
      return { success: true, data: response.data };
    }
    return { success: false, data: response.data };
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error(`Erro ao enviar mensagem p/ ${phoneNumber}:`, errData);
    return { success: false, error: errData };
  }
}

// Envia imagem (Base64 ou URL pública)
async function sendWhatsAppImage(phoneNumber, base64Image, caption = '') {
  try {
    let phone = phoneNumber;
    if (phone.startsWith('+')) phone = phone.slice(1);

    const payload = { phone, image: base64Image };
    if (caption) payload.caption = caption;

    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN
    };
    if (!ZAPI_URL_IMAGE) throw new Error('ZAPI_URL_IMAGE não configurado');

    const response = await axios.post(ZAPI_URL_IMAGE, payload, { headers, timeout: 60000 });
    console.log('Resposta Z-API image:', response.data);
    if (response.data && (response.data.success === true || response.status === 200)) {
      return { success: true, data: response.data };
    }
    return { success: false, data: response.data };
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error(`Erro ao enviar imagem p/ ${phoneNumber}:`, errData);
    return { success: false, error: errData };
  }
}

module.exports = { sendWhatsAppMessage, sendWhatsAppImage };
