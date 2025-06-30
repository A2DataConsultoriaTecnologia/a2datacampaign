// backend/src/services/scheduler.js
const cron = require('node-cron');
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { sendWhatsAppMessage, sendWhatsAppImage } = require('./zapiService');

async function checkAndSendCampaigns() {
  const now = new Date();
  const client = await pool.connect();

  try {
    // Inicia transação e bloqueia campanhas pendentes
    await client.query('BEGIN');
    const { rows: campaigns } = await client.query(
      `SELECT id, title, message
       FROM campaigns
       WHERE status = $1 AND scheduled_at <= $2
       FOR UPDATE SKIP LOCKED`,
      ['SCHEDULED', now]
    );

    if (campaigns.length === 0) {
      await client.query('COMMIT');
      console.log('[Scheduler] Nenhuma campanha pendente.');
      return;
    }

    // Marca como 'SENDING'
    const ids = campaigns.map(c => c.id);
    await client.query(
      `UPDATE campaigns
       SET status = 'SENDING', updated_at = NOW()
       WHERE id = ANY($1)`,
      [ids]
    );
    await client.query('COMMIT');

    // Processa cada campanha
    for (const camp of campaigns) {
      console.log(`[Scheduler] Enviando campanha id=${camp.id}`);

      // Buscar números e mídias
      const { rows: numbers } = await pool.query(
        `SELECT id, phone_number FROM campaign_numbers WHERE campaign_id = $1`,
        [camp.id]
      );
      const { rows: medias } = await pool.query(
        `SELECT filename, filepath, mime_type FROM campaign_media WHERE campaign_id = $1`,
        [camp.id]
      );

      // Função de retry
      async function trySend(fnSend, ...args) {
        const maxAttempts = 3;
        for (let i = 1; i <= maxAttempts; i++) {
          const { success, data, error } = await fnSend(...args);
          if (success) return { success, data };
          console.warn(`  [Tentativa ${i}/${maxAttempts} falhou]`, error || data);
          await new Promise(r => setTimeout(r, 1000 * i));
        }
        return { success: false };
      }

      // Envio por número
      for (const { id: numId, phone_number } of numbers) {
        let overallSuccess = true;
        let lastMessageId = null;

        if (medias.length > 0) {
          for (let i = 0; i < medias.length; i++) {
            const m = medias[i];
            const absolutePath = path.isAbsolute(m.filepath)
              ? m.filepath
              : path.join(__dirname, '..', '..', m.filepath);
            const buffer = fs.readFileSync(absolutePath);
            const base64 = `data:${m.mime_type};base64,${buffer.toString('base64')}`;
            const caption = i === 0
              ? `*${camp.title}*\n\n${camp.message}`
              : '';

            const res = await trySend(sendWhatsAppImage, phone_number, base64, caption);
            if (res.success) lastMessageId = res.data?.messageId;
            else overallSuccess = false;
          }
        } else {
          const fullText = `*${camp.title}*\n\n${camp.message}`;
          const res = await trySend(sendWhatsAppMessage, phone_number, fullText);
          if (res.success) lastMessageId = res.data?.messageId;
          else overallSuccess = false;
        }

        // Atualiza status do envio
        await pool.query(
          `UPDATE campaign_numbers
           SET sent_at = NOW(), success = $1, message_id = $2
           WHERE id = $3`,
          [overallSuccess, lastMessageId, numId]
        );
      }

      // Atualiza status da campanha
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*)::INT AS ct FROM campaign_numbers WHERE campaign_id = $1 AND success = true`,
        [camp.id]
      );
      const anySuccess = countRows[0].ct > 0;
      await pool.query(
        `UPDATE campaigns
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [anySuccess ? 'SENT' : 'FAILED', camp.id]
      );

      console.log(`[Scheduler] Campanha ${camp.id} finalizada: status ${anySuccess ? 'SENT' : 'FAILED'}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Scheduler] Erro geral ao processar campanhas:', err);
  } finally {
    client.release();
  }
}

function startScheduler() {
  cron.schedule('* * * * *', () => {
    console.log(`[Scheduler] Verificando campanhas em ${new Date().toISOString()}`);
    checkAndSendCampaigns();
  });
  console.log('[Scheduler] Agendado: checando a cada 1 minuto.');
}

module.exports = startScheduler;
