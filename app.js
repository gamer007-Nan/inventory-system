const STORAGE_KEY = 'stockroom-inventory-v1';
const HISTORY_LIMIT = 12;

const $ = (selector) => document.querySelector(selector);
const elements = {
  rows: $('#inventory-rows'), totalProducts: $('#total-products'), totalUnits: $('#total-units'),
  lowStockCount: $('#low-stock-count'), productCountLabel: $('#product-count-label'),
  emptyState: $('#empty-state'), noResults: $('#no-results'), search: $('#search-input'),
  activityList: $('#activity-list'), historyEmpty: $('#history-empty'), productDialog: $('#product-dialog'),
  adjustDialog: $('#adjust-dialog'), productForm: $('#product-form'), adjustForm: $('#adjust-form'), toast: $('#toast')
};

let state = loadState();
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.products) && Array.isArray(saved.history)) return saved;
  } catch (error) {
    console.warn('Could not read saved inventory:', error);
  }
  return { products: [], history: [] };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast('Could not save. Your browser storage may be full.');
    console.error('Could not save inventory:', error);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function isLowStock(product) {
  return Number(product.quantity) <= Number(product.threshold);
}

function render() {
  const query = elements.search.value.trim().toLowerCase();
  const visibleProducts = state.products.filter((product) => `${product.name} ${product.sku || ''}`.toLowerCase().includes(query));
  elements.totalProducts.textContent = state.products.length;
  elements.totalUnits.textContent = state.products.reduce((total, product) => total + Number(product.quantity || 0), 0);
  elements.lowStockCount.textContent = state.products.filter(isLowStock).length;
  elements.productCountLabel.textContent = `${state.products.length} ${state.products.length === 1 ? 'product' : 'products'}`;
  elements.emptyState.hidden = state.products.length > 0;
  elements.noResults.hidden = state.products.length === 0 || visibleProducts.length > 0;
  elements.rows.innerHTML = visibleProducts.map((product) => `
    <tr>
      <td><span class="product-name">${escapeHtml(product.name)}</span></td>
      <td class="sku">${escapeHtml(product.sku || '—')}</td>
      <td><span class="quantity">${Number(product.quantity)}</span> <span class="unit-label">units</span></td>
      <td><span class="badge ${isLowStock(product) ? 'badge-low' : 'badge-good'}"><span class="badge-dot"></span>${isLowStock(product) ? 'Low stock' : 'In stock'}</span></td>
      <td class="updated-date">${formatDate(product.updatedAt)}</td>
      <td><div class="row-actions"><button class="small-button" type="button" data-action="adjust" data-id="${escapeHtml(product.id)}">Adjust</button><button class="small-button" type="button" data-action="edit" data-id="${escapeHtml(product.id)}">Edit</button><button class="small-button danger-button" type="button" data-action="delete" data-id="${escapeHtml(product.id)}" aria-label="Delete ${escapeHtml(product.name)}">Delete</button></div></td>
    </tr>`).join('');

  elements.activityList.innerHTML = state.history.slice(0, HISTORY_LIMIT).map((entry) => `
    <li class="activity-item"><span class="activity-symbol ${entry.change >= 0 ? 'activity-plus' : 'activity-minus'}" aria-hidden="true">${entry.change >= 0 ? '+' : '−'}</span><div class="activity-copy"><p><strong>${escapeHtml(entry.name)}</strong> ${entry.change >= 0 ? 'increased by' : 'decreased by'} <strong>${Math.abs(Number(entry.change))}</strong> ${Math.abs(Number(entry.change)) === 1 ? 'unit' : 'units'}</p><time>${formatDate(entry.at)}</time></div><span class="activity-change ${entry.change >= 0 ? 'change-plus' : 'change-minus'}">${entry.change > 0 ? '+' : ''}${Number(entry.change)}</span></li>`).join('');
  elements.historyEmpty.hidden = state.history.length > 0;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2800);
}

function addHistory(name, change) {
  state.history.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name, change, at: new Date().toISOString() });
  state.history = state.history.slice(0, HISTORY_LIMIT);
}

function openProductDialog(product = null) {
  elements.productForm.reset();
  $('#product-id').value = product?.id || '';
  $('#product-name').value = product?.name || '';
  $('#product-sku').value = product?.sku || '';
  $('#product-quantity').value = product ? product.quantity : 0;
  $('#product-threshold').value = product ? product.threshold : 5;
  $('#dialog-title').textContent = product ? 'Edit product' : 'Add a product';
  $('#form-error').hidden = true;
  elements.productDialog.showModal();
  $('#product-name').focus();
}

$('#add-product-button').addEventListener('click', () => openProductDialog());
$('#empty-add-button').addEventListener('click', () => openProductDialog());
$('[data-close]').addEventListener('click', (event) => event.currentTarget.closest('dialog').close());
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', (event) => event.currentTarget.closest('dialog').close()));

elements.productForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const id = $('#product-id').value;
  const name = $('#product-name').value.trim();
  const sku = $('#product-sku').value.trim();
  const quantity = Number($('#product-quantity').value);
  const threshold = Number($('#product-threshold').value);
  const error = $('#form-error');
  if (!name || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(threshold) || threshold < 0) {
    error.textContent = 'Enter a product name and whole, non-negative quantities.';
    error.hidden = false;
    return;
  }
  const duplicate = state.products.some((product) => product.id !== id && sku && product.sku.toLowerCase() === sku.toLowerCase());
  if (duplicate) {
    error.textContent = 'That SKU is already used by another product.';
    error.hidden = false;
    return;
  }

  const existing = state.products.find((product) => product.id === id);
  const now = new Date().toISOString();
  if (existing) {
    const difference = quantity - Number(existing.quantity);
    Object.assign(existing, { name, sku, quantity, threshold, updatedAt: now });
    if (difference) addHistory(name, difference);
    showToast('Product updated.');
  } else {
    const product = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name, sku, quantity, threshold, updatedAt: now };
    state.products.unshift(product);
    if (quantity > 0) addHistory(name, quantity);
    showToast('Product added.');
  }
  saveState();
  render();
  elements.productDialog.close();
});

elements.rows.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const product = state.products.find((item) => item.id === button.dataset.id);
  if (!product) return;
  if (button.dataset.action === 'edit') openProductDialog(product);
  if (button.dataset.action === 'adjust') {
    $('#adjust-product-id').value = product.id;
    $('#adjust-title').textContent = `Adjust ${product.name}`;
    $('#current-stock').textContent = `Current quantity: ${product.quantity} ${Number(product.quantity) === 1 ? 'unit' : 'units'}`;
    $('#adjust-amount').value = '';
    $('#adjust-error').hidden = true;
    elements.adjustDialog.showModal();
    $('#adjust-amount').focus();
  }
  if (button.dataset.action === 'delete' && window.confirm(`Delete “${product.name}”? This cannot be undone.`)) {
    state.products = state.products.filter((item) => item.id !== product.id);
    saveState();
    render();
    showToast('Product deleted.');
  }
});

elements.adjustForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const product = state.products.find((item) => item.id === $('#adjust-product-id').value);
  const change = Number($('#adjust-amount').value);
  const error = $('#adjust-error');
  if (!product || !Number.isInteger(change) || change === 0 || Number(product.quantity) + change < 0) {
    error.textContent = product && Number(product.quantity) + change < 0 ? 'You cannot remove more than the quantity in stock.' : 'Enter a non-zero whole number.';
    error.hidden = false;
    return;
  }
  product.quantity = Number(product.quantity) + change;
  product.updatedAt = new Date().toISOString();
  addHistory(product.name, change);
  saveState();
  render();
  elements.adjustDialog.close();
  showToast('Stock updated.');
});

elements.search.addEventListener('input', render);
$('#clear-history-button').addEventListener('click', () => {
  if (!state.history.length) return;
  if (window.confirm('Clear all recent activity?')) {
    state.history = [];
    saveState();
    render();
    showToast('Activity cleared.');
  }
});

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

render();
