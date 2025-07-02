const express = require('express');
const router = express.Router();
const pool = require('../db');
const { validateCampaignInput } = require('../utils/validation');
const upload = require('../utils/fileUpload');
const fs = require('fs');
const path = require('path');

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || '';
function montaUrlDeArquivo(filepath) {
  if (!filepath) return null;
  let base = BACKEND_BASE_URL.replace(/\/+$/, '');
  let url = `${base}/${filepath}`.replace(/\/+/g, '/');
  return url.replace('http:/', 'http://').replace('https:/', 'https://');
}

// POST /api/campaigns
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const { title, message, scheduledAt } = req.body;
    let numbers = [];
    if (req.body.numbers) {
      numbers = JSON.parse(req.body.numbers);
      if (!Array.isArray(numbers)) throw new Error('numbers não é array');
    }

    const { valid, errors, cleanedNumbers } = validateCampaignInput({
      title, message, scheduledAt, numbers
    });
    if (!valid) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ errors });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertText = `
        INSERT INTO campaigns (title, message, scheduled_at)
        VALUES ($1, $2, $3)
        RETURNING id, title, message, scheduled_at, status, created_at, updated_at
      `;
      const { rows: [campaign] } = await client.query(insertText, [
        title, message, new Date(scheduledAt)
      ]);

      // insere números
      for (const phone of cleanedNumbers) {
        await client.query(
          `INSERT INTO campaign_numbers (campaign_id, phone_number) VALUES ($1, $2)`,
          [campaign.id, phone]
        );
      }

      // insere mídias
      if (req.files && req.files.length) {
        for (const file of req.files) {
          const idx = file.path.indexOf('uploads');
          const filepath = idx >= 0
            ? file.path.substring(idx).replace(/\\/g, '/')
            : `uploads/${file.filename}`;
          await client.query(
            `INSERT INTO campaign_media (campaign_id, filename, filepath, mime_type)
             VALUES ($1, $2, $3, $4)`,
            [campaign.id, file.originalname, filepath, file.mimetype]
          );
        }
      }

      await client.query('COMMIT');

      // monta resposta
      const { rows: numbersRows } = await pool.query(
        `SELECT id, phone_number, sent_at, success, message_id
         FROM campaign_numbers WHERE campaign_id = $1`,
        [campaign.id]
      );
      const { rows: mediaRows } = await pool.query(
        `SELECT id, filename, filepath, mime_type, created_at
         FROM campaign_media WHERE campaign_id = $1`,
        [campaign.id]
      );
      const media = mediaRows.map(m => ({
        ...m,
        url: montaUrlDeArquivo(m.filepath)
      }));

      res.status(201).json({
        ...campaign,
        numbers: numbersRows,
        media
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      console.error('Erro ao criar campanha:', err);
      res.status(500).json({ error: 'Erro interno ao criar campanha' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro geral:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/campaigns
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: campaigns } = await client.query(
      `SELECT id, title, message, scheduled_at, status, created_at, updated_at
       FROM campaigns
       ORDER BY scheduled_at DESC`
    );
    const result = [];
    for (const camp of campaigns) {
      const { rows: numbersRows } = await client.query(
        `SELECT id, phone_number, sent_at, success, message_id
         FROM campaign_numbers WHERE campaign_id = $1`,
        [camp.id]
      );
      const { rows: mediaRows } = await client.query(
        `SELECT id, filename, filepath, mime_type, created_at
         FROM campaign_media WHERE campaign_id = $1`,
        [camp.id]
      );
      const media = mediaRows.map(m => ({
        ...m,
        url: montaUrlDeArquivo(m.filepath)
      }));
      result.push({
        ...camp,
        numbers: numbersRows,
        media
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Erro ao listar campanhas:', err);
    res.status(500).json({ error: 'Erro interno ao listar campanhas' });
  } finally {
    client.release();
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT status FROM campaigns WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }
    if (rows[0].status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Só é possível deletar campanhas agendadas' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM campaign_media WHERE campaign_id = $1', [id]);
    await client.query('DELETE FROM campaign_numbers WHERE campaign_id = $1', [id]);
    await client.query('DELETE FROM campaigns WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.json({ message: 'Campanha deletada com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar campanha:', err);
    res.status(500).json({ error: 'Erro interno ao deletar campanha' });
  } finally {
    client.release();
  }
});

module.exports = router;
