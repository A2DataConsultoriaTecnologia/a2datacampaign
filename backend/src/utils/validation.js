function formatPhoneNumbers(numbers) {
  const result = new Set();
  numbers.forEach(raw => {
    if (typeof raw !== 'string') return;
    let num = raw.replace(/\D/g, '');
    if (!num) return;
    if (num.startsWith('55') && num.length >= 11) {
      result.add('+' + num);
    } else if (num.length === 11) {
      result.add('+55' + num);
    } else if ((num.length === 9 || num.length === 10)) {
      result.add('+55' + num);
    }
  });
  return Array.from(result);
}

function validateCampaignInput({ title, message, scheduledAt, numbers }) {
  const errors = {};
  let valid = true;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    valid = false;
    errors.title = 'Título é obrigatório';
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    valid = false;
    errors.message = 'Mensagem é obrigatória';
  }
  if (!scheduledAt || typeof scheduledAt !== 'string') {
    valid = false;
    errors.scheduledAt = 'Data e hora de envio são obrigatórios';
  } else {
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      valid = false;
      errors.scheduledAt = 'Data e hora inválidas';
    }
    // Se quiser bloquear datas passadas, descomente abaixo:
    // else if (date < new Date()) {
    //   valid = false;
    //   errors.scheduledAt = 'Data de envio deve ser futura';
    // }
  }
  if (!Array.isArray(numbers) || numbers.length === 0) {
    valid = false;
    errors.numbers = 'Informe pelo menos um número';
  }
  let cleanedNumbers = [];
  if (Array.isArray(numbers) && numbers.length > 0) {
    cleanedNumbers = formatPhoneNumbers(numbers);
    if (cleanedNumbers.length === 0) {
      valid = false;
      errors.numbers = 'Nenhum número válido após formatação';
    }
  }
  return { valid, errors, cleanedNumbers };
}

module.exports = { formatPhoneNumbers, validateCampaignInput };
