const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sendWhatsAppMessage } = require('../services/zapiService');

// POST /api/feedback
router.post('/', async (req, res) => {
  const { type, message, email } = req.body;

  if (!type || !message || message.trim().length < 10) {
    return res.status(400).json({ error: 'Tipo e mensagem (mínimo 10 caracteres) são obrigatórios.' });
  }

  // Monta texto pra enviar no WhatsApp
  const text = [
    `*Novo Feedback*`,
    `Tipo: ${type}`,
    `E-mail: ${email?.trim() || 'não informado'}`,
    `Mensagem:`,
    `${message.trim()}`
  ].join('\n\n');

  try {
    // 1) Gravar no banco
    await pool.query(
      `INSERT INTO feedbacks (email, type, message) VALUES ($1, $2, $3)`,
      [email?.trim(), type, message.trim()]
    );

    // 2) Enviar pra admin no WhatsApp
    const adminNumber = '558393725984';
    const { success, error } = await sendWhatsAppMessage(adminNumber, text);

    if (!success) {
      console.warn('Falha ao enviar feedback por WhatsApp:', error);
      // mas não falha a API; já gravou no DB
    }

    return res.json({ success: true, sent: !!success });
  } catch (err) {
    console.error('Erro em /api/feedback:', err);
    return res.status(500).json({ error: 'Erro interno ao processar feedback.' });
  }
});

module.exports = router;
