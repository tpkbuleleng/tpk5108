window.ClientId = {
  generate(prefix = 'SUB') {
    const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `${prefix}-${Date.now()}-${randomPart}`;
  },

  ensure(value, prefix = 'SUB') {
    const current = String(value || '').trim();
    return current || this.generate(prefix);
  },

  queueId() {
    return this.generate('Q');
  }
};
