window.DynamicForm = {
  render(containerId, fields = [], values = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!Array.isArray(fields) || !fields.length) {
      container.innerHTML = '<p class="muted-text">Tidak ada field dinamis.</p>';
      return;
    }

    const html = fields.map(field => this.renderField(field, values)).join('');
    container.innerHTML = html;
  },

  renderField(field, values = {}) {
    const questionCode = String(field.question_code || '').trim();
    const label = String(field.label || questionCode || 'Field').trim();
    const type = String(field.type || 'text').trim().toLowerCase();
    const placeholder = String(field.placeholder || '').trim();
    const required = !!field.required;
    const value = values[questionCode] ?? '';

    const inputId = `dyn-${questionCode}`;
    const requiredMark = required ? ' *' : '';
    const requiredAttr = required ? 'required' : '';

    return `
      <div class="dynamic-field-card">
        <div class="form-group">
          <label for="${inputId}">${label}${requiredMark}</label>
          ${this.buildInput({
            inputId,
            questionCode,
            type,
            placeholder,
            requiredAttr,
            value,
            options: field.options || []
          })}
        </div>
      </div>
    `;
  },

  buildInput({ inputId, questionCode, type, placeholder, requiredAttr, value, options }) {
    if (type === 'textarea') {
      return `
        <textarea
          id="${inputId}"
          name="${questionCode}"
          data-dynamic-key="${questionCode}"
          rows="3"
          placeholder="${this.escapeAttr(placeholder)}"
          ${requiredAttr}
        >${this.escapeHtml(String(value || ''))}</textarea>
      `;
    }

    if (type === 'select') {
      const optionsHtml = (Array.isArray(options) ? options : []).map(opt => {
        const optionValue = typeof opt === 'object' ? (opt.value ?? '') : opt;
        const optionLabel = typeof opt === 'object' ? (opt.label ?? optionValue) : opt;
        const selected = String(optionValue) === String(value) ? 'selected' : '';

        return `<option value="${this.escapeAttr(String(optionValue))}" ${selected}>${this.escapeHtml(String(optionLabel))}</option>`;
      }).join('');

      return `
        <select
          id="${inputId}"
          name="${questionCode}"
          data-dynamic-key="${questionCode}"
          ${requiredAttr}
        >
          <option value="">Pilih</option>
          ${optionsHtml}
        </select>
      `;
    }

    const inputType = this.normalizeInputType(type);

    return `
      <input
        id="${inputId}"
        name="${questionCode}"
        data-dynamic-key="${questionCode}"
        type="${inputType}"
        value="${this.escapeAttr(String(value || ''))}"
        placeholder="${this.escapeAttr(placeholder)}"
        ${requiredAttr}
      />
    `;
  },

  collect(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return {};

    const values = {};
    container.querySelectorAll('[data-dynamic-key]').forEach(el => {
      values[el.dataset.dynamicKey] = el.value;
    });

    return values;
  },

  fill(containerId, values = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('[data-dynamic-key]').forEach(el => {
      const key = el.dataset.dynamicKey;
      if (values[key] !== undefined && values[key] !== null) {
        el.value = values[key];
      }
    });
  },

  clear(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('[data-dynamic-key]').forEach(el => {
      el.value = '';
    });
  },

  normalizeInputType(type) {
    const allowed = ['text', 'number', 'date', 'datetime-local', 'email', 'tel'];
    return allowed.includes(type) ? type : 'text';
  },

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  escapeAttr(value) {
    return this.escapeHtml(value);
  }
};
