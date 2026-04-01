window.DynamicForm = {
  render(containerId, fields = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = fields.map(field => {
      return `
        <div class="form-group">
          <label for="${field.question_code}">${field.label}${field.required ? ' *' : ''}</label>
          <input
            id="${field.question_code}"
            name="${field.question_code}"
            type="${field.type || 'text'}"
            placeholder="${field.placeholder || ''}"
            ${field.required ? 'required' : ''}
          />
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }
};
