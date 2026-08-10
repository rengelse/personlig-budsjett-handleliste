window.UI = {
  money(value) {
    return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(value);
  },
  pageHeader(title, description, actions = '') {
    const actionHtml = actions ? `<div class="header-actions page-header-actions">${actions}</div>` : '';
    return `<header class="page-header"><div class="page-header-copy"><h2 class="page-title">${title}</h2>${description ? `<p class="page-description">${description}</p>` : ''}</div>${actionHtml}</header>`;
  },
  button(label, style = 'primary') {
    return `<button class="btn ${style}">${label}</button>`;
  },
  kpi(label, value, hint, cls='') {
    return `<article class="card kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value ${cls}">${value}</div>${hint ? `<div class="kpi-hint">${hint}</div>` : ''}</article>`;
  },
  card(title, body, extra='') {
    return `<section class="card content-card"><div class="card-header"><h3>${title}</h3>${extra ? `<div class="card-header-extra">${extra}</div>` : ''}</div><div class="card-body">${body}</div></section>`;
  },
  table(headers, rows, options = {}) {
    const columns = headers.map((header, index) => {
      if (typeof header === 'object' && header !== null) {
        return { label: header.label ?? '', key: header.key ?? `col-${index}`, align: header.align || 'left', sortable: Boolean(header.sortable), width: header.width || '' };
      }
      return { label: header, key: `col-${index}`, align: 'left', sortable: false, width: '' };
    });
    const tableClass = ['ui-table', options.className || '', options.stickyHeader ? 'has-sticky-header' : ''].filter(Boolean).join(' ');
    const emptyText = options.emptyText || 'Ingen data å vise.';
    const bodyRows = Array.isArray(rows) ? rows : [];
    const head = columns.map((column, index) => {
      const classes = [`align-${column.align}`];
      if (column.sortable) classes.push('is-sortable');
      const width = column.width ? ` style="width:${column.width}"` : '';
      const sortAttrs = column.sortable ? ` data-sort-index="${index}" data-sort-key="${column.key}" aria-sort="none" tabindex="0"` : '';
      const indicator = column.sortable ? '<span class="table-sort-indicator" aria-hidden="true"></span>' : '';
      return `<th scope="col" class="${classes.join(' ')}"${width}${sortAttrs}>${column.label}${indicator}</th>`;
    }).join('');
    const body = options.loading
      ? `<tr class="table-state-row"><td colspan="${Math.max(1, columns.length)}"><div class="table-state table-loading"><span class="table-spinner" aria-hidden="true"></span><span>${options.loadingText || 'Laster…'}</span></div></td></tr>`
      : bodyRows.length
        ? bodyRows.map(row => {
          const rowCells = Array.isArray(row) ? row : (Array.isArray(row?.cells) ? row.cells : []);
          const rowClass = !Array.isArray(row) && row?.className ? ` class="${row.className}"` : '';
          const rowCrudId = !Array.isArray(row) && row?.crudId ? ` data-crud-id="${row.crudId}"` : '';
          return `<tr${rowClass}${rowCrudId}>${rowCells.map((cell, index) => `<td class="align-${columns[index]?.align || 'left'}">${cell}</td>`).join('')}</tr>`;
        }).join('')
        : `<tr class="table-state-row"><td colspan="${Math.max(1, columns.length)}"><div class="table-state table-empty">${emptyText}</div></td></tr>`;
    return `<div class="table-wrap ${options.wrapClass || ''}"><table class="${tableClass}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  },
  tableToolbar(search = '', actions = '', options = {}) {
    const searchHtml = search ? `<div class="table-toolbar-search">${search}</div>` : '';
    const actionHtml = actions ? `<div class="table-toolbar-actions">${actions}</div>` : '';
    return `<div class="table-toolbar ${options.className || ''}">${searchHtml}${actionHtml}</div>`;
  },
  initTableSorting(root = document) {
    root.querySelectorAll('.ui-table th.is-sortable').forEach(header => {
      if (header.dataset.sortBound === 'true') return;
      header.dataset.sortBound = 'true';
      const activate = () => {
        const table = header.closest('table');
        const tbody = table?.tBodies?.[0];
        if (!tbody) return;
        const index = Number(header.dataset.sortIndex);
        const nextDirection = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        table.querySelectorAll('th[aria-sort]').forEach(th => th.setAttribute('aria-sort', 'none'));
        header.setAttribute('aria-sort', nextDirection);
        const factor = nextDirection === 'ascending' ? 1 : -1;
        const rows = [...tbody.rows].filter(row => !row.classList.contains('table-state-row'));
        rows.sort((a, b) => {
          const av = a.cells[index]?.dataset.sortValue ?? a.cells[index]?.textContent?.trim() ?? '';
          const bv = b.cells[index]?.dataset.sortValue ?? b.cells[index]?.textContent?.trim() ?? '';
          const an = Number(String(av).replace(/−/g, '-').replace(/[^0-9,.-]/g, '').replace(',', '.'));
          const bn = Number(String(bv).replace(/−/g, '-').replace(/[^0-9,.-]/g, '').replace(',', '.'));
          if (Number.isFinite(an) && Number.isFinite(bn) && /\d/.test(av) && /\d/.test(bv)) return (an - bn) * factor;
          return String(av).localeCompare(String(bv), 'nb-NO', { numeric: true, sensitivity: 'base' }) * factor;
        });
        rows.forEach(row => tbody.appendChild(row));
      };
      header.addEventListener('click', activate);
      header.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
      });
    });
  },
  progress(value, cls='') {
    return `<div class="progress ${cls}"><span style="width:${Math.min(100, value)}%"></span></div>`;
  },
  badge(text, cls='') { return `<span class="badge ${cls}">${text}</span>`; },
  filterGroup(title, body, open=false) {
    return `<details class="product-filter-group" ${open?'open':''}><summary>${title}</summary><div class="filter-group-body">${body}</div></details>`;
  },
  emptyState(title, text='') {
    return `<div class="card empty-product-state empty-state"><div class="card-body"><strong>${title}</strong>${text?`<p class="muted">${text}</p>`:''}</div></div>`;
  }
};
