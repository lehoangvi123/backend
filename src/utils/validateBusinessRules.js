function validateBusinessRules(operation) {
  const { type } = operation;

  switch (type) {
    case 'convert':
      const { from, to, amount } = operation;
      if (!from || !to || isNaN(amount) || amount <= 0) {
        return { valid: false, message: '⚠️ Chuyển đổi không hợp lệ. Vui lòng kiểm tra dữ liệu đầu vào.' };
      }
      if (from === to) {
        return { valid: false, message: '⚠️ Không thể chuyển đổi giữa hai đơn vị tiền giống nhau.' };
      }
      return { valid: true };

    case 'alert':
      const { targetRate, direction } = operation;
      if (isNaN(targetRate) || targetRate <= 0) {
        return { valid: false, message: '⚠️ Mức tỷ giá cảnh báo phải lớn hơn 0.' };
      }
      if (!['above', 'below'].includes(direction)) {
        return { valid: false, message: '⚠️ Hướng cảnh báo không hợp lệ (chỉ nhận "above" hoặc "below").' };
      }
      return { valid: true };

    case 'saveRate':
      const { rateData } = operation;
      if (!rateData || typeof rateData !== 'object' || !Object.keys(rateData).length) {
        return { valid: false, message: '⚠️ Dữ liệu tỷ giá không hợp lệ.' };
      }
      return { valid: true };

    case 'preferences':
      const { theme, language, notifications } = operation;
      if (!['light', 'dark'].includes(theme)) {
        return { valid: false, message: '⚠️ Giao diện không hợp lệ.' };
      }
      if (!['en', 'vi'].includes(language)) {
        return { valid: false, message: '⚠️ Ngôn ngữ không hợp lệ.' };
      }
      if (typeof notifications !== 'boolean') {
        return { valid: false, message: '⚠️ Giá trị thông báo phải là true/false.' };
      }
      return { valid: true };

    default:
      return { valid: false, message: '⚠️ Loại thao tác không được hỗ trợ.' };
  }
}

module.exports = validateBusinessRules;
