// backend/src/routes/campaigns.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { validateCampaignInput } = require('../utils/validation');
const upload = require('../utils/fileUpload');
const fs = require('fs');
const path = require('path');

// Para montar URL de preview: use BACKEND_BASE_URL no .env, ex: http://localhost:3001
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || '';

// Helper para montar URL pública de mídia a partir do filepath salvo (relativo em uploads/)
function montaUrlDeArquivo(filepath) {
  if (!filepath) return null;
  // filepath esperado ex: 'uploads/nome-arquivo.png'
  // BACKEND_BASE_URL pode terminar ou não em slash
  let base = BACKEND_BASE_URL.replace(/\/+$/, ''); // remove barra final
  // Assegura que a rota estática serve em '/uploads'
  let url = `${base}/${filepath}`.replace(/\/+/g, '/');
  // Corrige http:/ para http://, caso ocorra
  url = url.replace('http:/', 'http://').replace('https:/', 'https://');
  return url;
}

/**
 * POST /api/campaigns
 * Recebe multipart/form-data:
 *  - campos textuais: title, message, scheduledAt, numbers (JSON string)
 *  - arquivos: até 5 imagens no campo 'images'
 */
router.post('/', upload.array('images', 5), async (req, res) => {
  // req.files: array de arquivos; req.body: campos textuais
  try {
    const { title, message, scheduledAt } = req.body;
    // numbers deve vir como JSON string: '["+5511...", "+5511..."]'
    let numbers = [];
    if (req.body.numbers) {
      try {
        numbers = JSON.parse(req.body.numbers);
        if (!Array.isArray(numbers)) {
          throw new Error('numbers não é array');
        }
      } catch (e) {
        // Remove arquivos gravados antes de retornar erro
        if (req.files && req.files.length) {
          for (const file of req.files) {
            fs.unlink(file.path, () => {});
          }
        }
        return res.status(400).json({ errors: { numbers: 'Formato inválido para números' } });
      }
    }
    // Validação textual
    const { valid, errors, cleanedNumbers } = validateCampaignInput({
      title, message, scheduledAt, numbers
    });
    if (!valid) {
      // Limpar arquivos salvos se houver
      if (req.files && req.files.length) {
        for (const file of req.files) {
          fs.unlink(file.path, () => {});
        }
      }
      return res.status(400).json({ errors });
    }
    const scheduledDate = new Date(scheduledAt);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Inserir campanha
      const insertCampaignText = `
        INSERT INTO campaigns (title, message, scheduled_at)
        VALUES ($1, $2, $3)
        RETURNING id, title, message, scheduled_at, status, created_at, updated_at
      `;
      const resCampaign = await client.query(insertCampaignText, [title, message, scheduledDate]);
      const campaign = resCampaign.rows[0];
      const campaignId = campaign.id;

      // Inserir números formatados
      const insertNumberText = `
        INSERT INTO campaign_numbers (campaign_id, phone_number)
        VALUES ($1, $2)
      `;
      for (const phone of cleanedNumbers) {
        await client.query(insertNumberText, [campaignId, phone]);
      }

      // Inserir metadados de mídia
      if (req.files && req.files.length) {
        const insertMediaText = `
          INSERT INTO campaign_media (campaign_id, filename, filepath, mime_type)
          VALUES ($1, $2, $3, $4)
          RETURNING id, filename, filepath, mime_type, created_at
        `;
        for (const file of req.files) {
          // Montar filepath relativo: extrair desde 'uploads/...'
          let relativePath;
          if (file.path.includes('uploads')) {
            const idx = file.path.indexOf('uploads');
            relativePath = file.path.substring(idx).replace(/\\/g, '/');
          } else {
            relativePath = `uploads/${file.filename}`;
          }
          await client.query(insertMediaText, [
            campaignId,
            file.originalname,
            relativePath,
            file.mimetype
          ]);
        }
      }

      await client.query('COMMIT');

      // Buscar números inseridos
      const resNums = await pool.query(
        `SELECT id, phone_number, sent_at, success 
         FROM campaign_numbers WHERE campaign_id = $1`,
        [campaignId]
      );
      // Buscar mídias inseridas
      const mediaRes = await pool.query(
        `SELECT id, filename, filepath, mime_type, created_at 
         FROM campaign_media WHERE campaign_id = $1`,
        [campaignId]
      );
      const mediaList = mediaRes.rows.map(m => ({
        id: m.id,
        filename: m.filename,
        filepath: m.filepath,
        mime_type: m.mime_type,
        created_at: m.created_at,
        url: montaUrlDeArquivo(m.filepath),
      }));

      const campaignObj = {
        ...campaign,
        scheduled_at: campaign.scheduled_at,
        numbers: resNums.rows,
        media: mediaList
      };
      return res.status(201).json(campaignObj);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erro ao criar campanha com mídia:', err);
      // Limpar arquivos salvos
      if (req.files && req.files.length) {
        for (const file of req.files) {
          fs.unlink(file.path, () => {});
        }
      }
      return res.status(500).json({ error: 'Erro interno ao criar campanha' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro geral no processamento de criação de campanha:', err);
    // Limpar arquivos recebidos, se houver
    if (req.files && req.files.length) {
      for (const file of req.files) {
        fs.unlink(file.path, () => {});
      }
    }
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/campaigns
 * Lista todas campanhas, incluindo números e mídias associadas.
 */
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const resCamp = await client.query(
      `SELECT id, title, message, scheduled_at, status, created_at, updated_at
       FROM campaigns
       ORDER BY scheduled_at DESC`
    );
    const campaigns = resCamp.rows;
    const result = [];
    for (const camp of campaigns) {
      // Números
      const resNums = await client.query(
        `SELECT id, phone_number, sent_at, success 
         FROM campaign_numbers 
         WHERE campaign_id = $1`,
        [camp.id]
      );
      // Mídias
      const resMedia = await client.query(
        `SELECT id, filename, filepath, mime_type, created_at 
         FROM campaign_media WHERE campaign_id = $1`,
        [camp.id]
      );
      const mediaList = resMedia.rows.map(m => ({
        id: m.id,
        filename: m.filename,
        filepath: m.filepath,
        mime_type: m.mime_type,
        created_at: m.created_at,
        url: montaUrlDeArquivo(m.filepath),
      }));
      result.push({
        ...camp,
        numbers: resNums.rows,
        media: mediaList
      });
    }
    return res.json(result);
  } catch (err) {
    console.error('Erro ao listar campanhas:', err);
    return res.status(500).json({ error: 'Erro interno ao listar campanhas' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/campaigns/:id
 * Retorna campanha específica, com números e mídias.
 */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const client = await pool.connect();
  try {
    const resCamp = await client.query(
      `SELECT id, title, message, scheduled_at, status, created_at, updated_at
       FROM campaigns WHERE id = $1`,
      [id]
    );
    if (resCamp.rowCount === 0) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }
    const camp = resCamp.rows[0];
    // Números
    const resNums = await client.query(
      `SELECT id, phone_number, sent_at, success 
       FROM campaign_numbers WHERE campaign_id = $1`,
      [id]
    );
    // Mídias
    const resMedia = await client.query(
      `SELECT id, filename, filepath, mime_type, created_at 
       FROM campaign_media WHERE campaign_id = $1`,
      [id]
    );
    const mediaList = resMedia.rows.map(m => ({
      id: m.id,
      filename: m.filename,
      filepath: m.filepath,
      mime_type: m.mime_type,
      created_at: m.created_at,
      url: montaUrlDeArquivo(m.filepath),
    }));
    return res.json({
      ...camp,
      numbers: resNums.rows,
      media: mediaList
    });
  } catch (err) {
    console.error('Erro ao buscar campanha:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar campanha' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/campaigns/:id
 * Apenas permite deletar se status = 'SCHEDULED'.
 * Antes de apagar do DB, remove arquivos físicos de mídia.
 */
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const client = await pool.connect();
  try {
    // Verificar existência e status
    const resCamp = await client.query(
      `SELECT status FROM campaigns WHERE id = $1`,
      [id]
    );
    if (resCamp.rowCount === 0) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }
    const status = resCamp.rows[0].status;
    if (status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Não é possível deletar campanha já enviada' });
    }
    // Buscar mídias para deletar arquivos
    const resMedia = await client.query(
      `SELECT filepath FROM campaign_media WHERE campaign_id = $1`,
      [id]
    );
    for (const m of resMedia.rows) {
      // Montar caminho absoluto do arquivo
      let absolutePath;
      if (path.isAbsolute(m.filepath)) {
        absolutePath = m.filepath;
      } else {
        absolutePath = path.join(__dirname, '..', '..', m.filepath);
      }
      fs.unlink(absolutePath, err => {
        if (err) console.warn(`Falha ao deletar arquivo de mídia: ${absolutePath}`, err);
      });
    }
    // Deletar campanha (campaign_media será removido por ON DELETE CASCADE)
    await client.query(
      `DELETE FROM campaigns WHERE id = $1`,
      [id]
    );
    return res.json({ message: 'Campanha deletada' });
  } catch (err) {
    console.error('Erro ao deletar campanha:', err);
    return res.status(500).json({ error: 'Erro interno ao deletar campanha' });
  } finally {
    client.release();
  }
});

module.exports = router;
