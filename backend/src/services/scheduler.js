// backend/src/services/scheduler.js
const cron = require('node-cron');
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { sendWhatsAppMessage, sendWhatsAppImage } = require('./zapiService');

async function checkAndSendCampaigns() {
  const now = new Date();
  console.log(`[Scheduler] Verificando campanhas em ${now.toISOString()}`);
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, title, message 
       FROM campaigns 
       WHERE status = $1 AND scheduled_at <= $2`,
      ['SCHEDULED', now]
    );
    const campaigns = res.rows;
    if (campaigns.length === 0) {
      return;
    }
    for (const campaign of campaigns) {
      console.log(`[Scheduler] Enviando campanha id=${campaign.id}, title="${campaign.title}"`);
      // Buscar números
      const resNums = await client.query(
        `SELECT id, phone_number 
         FROM campaign_numbers 
         WHERE campaign_id = $1`,
        [campaign.id]
      );
      const numbers = resNums.rows;
      // Buscar mídias associadas
      const resMedia = await client.query(
        `SELECT id, filename, filepath, mime_type 
         FROM campaign_media 
         WHERE campaign_id = $1`,
        [campaign.id]
      );
      const medias = resMedia.rows; // array de {id, filename, filepath, mime_type}
      // Para cada número:
      for (const cn of numbers) {
        let overallSuccess = true;
        let lastMessageId = null;

        // 1) Se houver mídias, enviar cada imagem
        if (medias.length > 0) {
          for (let i = 0; i < medias.length; i++) {
            const m = medias[i];
            try {
              // Montar caminho absoluto para ler arquivo
              let absolutePath;
              if (path.isAbsolute(m.filepath)) {
                absolutePath = m.filepath;
              } else {
                absolutePath = path.join(__dirname, '..', '..', m.filepath);
              }
              // Ler arquivo
              const fileBuffer = fs.readFileSync(absolutePath);
              // Converter para base64 data URI
              const base64 = `data:${m.mime_type};base64,${fileBuffer.toString('base64')}`;
              // Caption: inclui título + mensagem somente na primeira imagem
              const titleText = campaign.title || '';
              const messageText = campaign.message || '';
              // Monta legenda com Markdown para negrito de título
              const caption = (i === 0)
                ? `*${titleText}*\n\n${messageText}`
                : '';
              const { success, data, error } = await sendWhatsAppImage(cn.phone_number, base64, caption);
              const nowSent = new Date();
              lastMessageId = data?.messageId || data?.id || null;
              if (!success) {
                overallSuccess = false;
                console.warn(`  [!] Falha ao enviar imagem p/ ${cn.phone_number}:`, error || data);
              } else {
                console.log(`  [+] Imagem enviada p/ ${cn.phone_number}, messageId=${lastMessageId}`);
              }
            } catch (err) {
              overallSuccess = false;
              console.error(`  [!] Erro ao processar mídia p/ ${cn.phone_number}:`, err);
            }
          }
        }
        // 2) Se não tiver mídia, enviar texto puro, incluindo título
        if (medias.length === 0) {
          try {
            const titleText = campaign.title || '';
            const messageText = campaign.message || '';
            const fullText = `*${titleText}*\n\n${messageText}`;
            const { success, data, error } = await sendWhatsAppMessage(cn.phone_number, fullText);
            const nowSent = new Date();
            lastMessageId = data?.messageId || data?.id || null;
            if (!success) {
              overallSuccess = false;
              console.warn(`  [!] Falha ao enviar texto p/ ${cn.phone_number}:`, error || data);
            } else {
              console.log(`  [+] Texto enviado p/ ${cn.phone_number}, messageId=${lastMessageId}`);
            }
          } catch (err) {
            overallSuccess = false;
            console.error(`  [!] Erro ao enviar texto p/ ${cn.phone_number}:`, err);
          }
        }

        // 3) Atualizar registro campaign_numbers
        try {
          const nowSentAll = new Date();
          await client.query(
            `UPDATE campaign_numbers 
             SET sent_at = $1, success = $2, message_id = $3
             WHERE id = $4`,
            [nowSentAll, overallSuccess, lastMessageId, cn.id]
          );
        } catch (err) {
          console.error(`  [!] Erro ao atualizar status no DB para ${cn.phone_number}:`, err);
        }
      }
      // Após processar todos os números, atualizar status da campanha
      try {
        await client.query(
          `UPDATE campaigns 
           SET status = $1, updated_at = NOW() 
           WHERE id = $2`,
          ['SENT', campaign.id]
        );
        console.log(`[Scheduler] Campanha id=${campaign.id} marcada como SENT.`);
      } catch (err) {
        console.error(`[Scheduler] Erro ao atualizar status da campanha id=${campaign.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Erro geral ao processar campanhas:', err);
  } finally {
    client.release();
  }
}

function startScheduler() {
  // Agenda para rodar a cada minuto. Ajuste conforme necessidade.
  cron.schedule('* * * * *', () => {
    checkAndSendCampaigns();
  });
  console.log('[Scheduler] Iniciado: checando campanhas a cada 1 minuto.');
}

module.exports = startScheduler;
