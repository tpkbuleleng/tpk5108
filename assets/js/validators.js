window.Validators = {
  digitsOnly(value = '') {
    return String(value).replace(/\D/g, '');
  },

  isPassword16(value = '') {
    return /^\d{16}$/.test(String(value));
  },

  isNikOrKK16(value = '') {
    return /^\d{16}$/.test(String(value));
  },

  isRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  },

  isNonEmptyObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
  }
};
