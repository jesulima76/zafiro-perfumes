/**
 * ZAFIRO PERFUMES - APPLICATION LOGIC
 * Conexión en tiempo real con Google Sheets, Carrito de Compras y Pedidos por WhatsApp
 */

// Estado global de la aplicación
const AppState = {
  config: Object.assign({}, DEFAULT_CONFIG),
  products: [],
  filteredProducts: [],
  cart: [],
  currentCategory: 'TODOS',
  currentBrand: 'TODOS',
  searchQuery: '',
  selectedProduct: null,
  isLoading: true
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  initEventListeners();
  renderApp();
  syncWithGoogleSheets(true);

  // Sincronización automática periódica en segundo plano cada 60 segundos
  setInterval(() => {
    syncWithGoogleSheets(false);
  }, 60000);
});

/**
 * Carga datos iniciales y datos guardados en LocalStorage
 */
function loadSavedData() {
  // Configuración
  const savedConfig = localStorage.getItem('zafiro_config');
  if (savedConfig) {
    try {
      AppState.config = Object.assign({}, DEFAULT_CONFIG, JSON.parse(savedConfig));
    } catch (e) {
      console.warn('Error al leer config guardada:', e);
    }
  }

  // Productos (arranca con los datos iniciales pre-empaquetados)
  const savedProducts = localStorage.getItem('zafiro_products');
  if (savedProducts) {
    try {
      AppState.products = JSON.parse(savedProducts);
    } catch (e) {
      AppState.products = [...INITIAL_PRODUCTS];
    }
  } else {
    AppState.products = [...INITIAL_PRODUCTS];
  }

  // Carrito de compras
  const savedCart = localStorage.getItem('zafiro_cart');
  if (savedCart) {
    try {
      AppState.cart = JSON.parse(savedCart);
    } catch (e) {
      AppState.cart = [];
    }
  }

  applyFilters();
}

/**
 * Sincroniza datos en tiempo real desde Google Sheets (Sin retraso de caché y compatible con file:///)
 * @param {boolean} notifyUser - Si es true, muestra una notificación visual toast al finalizar
 */
async function syncWithGoogleSheets(notifyUser = false) {
  const sheetId = AppState.config.sheetId || '1dNLzAn3_pLI95Us6S7TYoYVyqHDu1HZ5MTrFoRbjVAo';
  updateSyncStatus('Sincronizando con Google Sheets...', '#eab308');

  const reloadBtn = document.getElementById('btn-sync-reload');
  if (reloadBtn) reloadBtn.classList.add('spinning');

  let updatedSuccessfully = false;

  // 1. Método A: JSONP con Google Visualization API (Funciona localmente en file:/// y en vivo sin caché)
  try {
    // Sincronizar Productos (gid=0)
    const productsTable = await fetchGoogleSheetsJSONP(sheetId, '0', 'onGvizProducts');
    const parsedProducts = parseGvizProductsTable(productsTable);

    if (parsedProducts && parsedProducts.length > 0) {
      AppState.products = parsedProducts;
      localStorage.setItem('zafiro_products', JSON.stringify(parsedProducts));
      applyFilters();
      renderCatalog();
      renderBrandFilters();
      updatedSuccessfully = true;
    }

    // Sincronizar Configuración (gid=934150705)
    try {
      const configTable = await fetchGoogleSheetsJSONP(sheetId, '934150705', 'onGvizConfig');
      parseGvizConfigTable(configTable);
    } catch (cfgErr) {
      console.warn('Error al leer configuración por JSONP:', cfgErr);
    }

  } catch (jsonpErr) {
    console.warn('JSONP no disponible, intentando vía Fetch directo...', jsonpErr);

    // 2. Método B: Fallback vía Fetch HTTP (Para cuando está subido en Netlify / GitHub Pages / Vercel)
    try {
      if (AppState.config.sheetProductsUrl) {
        const prodResp = await fetch(AppState.config.sheetProductsUrl + '&_t=' + Date.now());
        if (prodResp.ok) {
          const prodCsv = await prodResp.text();
          const parsedProducts = parseProductsCSV(prodCsv);
          if (parsedProducts && parsedProducts.length > 0) {
            AppState.products = parsedProducts;
            localStorage.setItem('zafiro_products', JSON.stringify(parsedProducts));
            applyFilters();
            renderCatalog();
            renderBrandFilters();
            updatedSuccessfully = true;
          }
        }
      }

      if (AppState.config.sheetConfigUrl) {
        const configResp = await fetch(AppState.config.sheetConfigUrl + '&_t=' + Date.now());
        if (configResp.ok) {
          const configCsv = await configResp.text();
          parseConfigCSV(configCsv);
        }
      }
    } catch (fetchErr) {
      console.warn('Fetch directo también bloqueado:', fetchErr);
    }
  }

  // Actualizar estado visual
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (updatedSuccessfully) {
    updateSyncStatus(`Catálogo en vivo • Actualizado ${timeStr}`, '#22c55e');
    if (notifyUser) {
      showToast(`✅ ¡Catálogo actualizado desde Google Sheets! (${AppState.products.length} fragancias)`);
    }
  } else {
    updateSyncStatus(`Modo local / Caché • ${timeStr}`, '#3b82f6');
    if (notifyUser) {
      showToast('No se pudo conectar a Google Sheets. Mostrando catálogo guardado.');
    }
  }

  if (reloadBtn) {
    setTimeout(() => reloadBtn.classList.remove('spinning'), 400);
  }
}

/**
 * Consulta Google Sheets mediante JSONP (Inyección dinámica de script).
 * Funciona de manera universal:
 * 1. Funciona en protocolo file:/// (sin bloqueos de CORS del navegador).
 * 2. Cero retraso de caché: consulta directamente el motor en vivo de Google Sheets.
 */
function fetchGoogleSheetsJSONP(sheetId, gid, handlerPrefix) {
  return new Promise((resolve, reject) => {
    const callbackName = handlerPrefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Tiempo de espera agotado al consultar Google Sheets'));
    }, 12000);

    function cleanup() {
      clearTimeout(timeout);
      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }
      const scriptEl = document.getElementById('gviz_script_' + callbackName);
      if (scriptEl) scriptEl.remove();
    }

    window[callbackName] = function(response) {
      cleanup();
      if (response && response.status === 'ok' && response.table) {
        resolve(response.table);
      } else {
        reject(new Error('Respuesta inválida de Google Sheets'));
      }
    };

    const script = document.createElement('script');
    script.id = 'gviz_script_' + callbackName;
    // Parámetros: responseHandler genera JSONP, headers=1 incluye encabezados, _t elimina cualquier caché del navegador
    script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${gid}&headers=1&_t=${Date.now()}`;
    script.onerror = function(err) {
      cleanup();
      reject(err);
    };
    document.head.appendChild(script);
  });
}

/**
 * Parsea la tabla de Google Visualization API a la lista de productos
 */
function parseGvizProductsTable(table) {
  if (!table || !table.rows || table.rows.length === 0) return null;

  // Determinar índices de columnas por etiqueta o posición
  let colCat = 0, colMarca = 1, colNombre = 2, colDesc = 3, colPres = 4, colPrecio = 5, colImg = 6, colCant = 7, colPromo = 8;
  
  if (table.cols && table.cols.length > 0) {
    table.cols.forEach((col, idx) => {
      const label = (col.label || '').toUpperCase().trim();
      if (label === 'CATEGORIA') colCat = idx;
      else if (label === 'MARCA') colMarca = idx;
      else if (label === 'NOMBRE') colNombre = idx;
      else if (label === 'DESCRIPCION') colDesc = idx;
      else if (label === 'PRESENTACION') colPres = idx;
      else if (label === 'PRECIO') colPrecio = idx;
      else if (label === 'IMAGEN') colImg = idx;
      else if (label === 'CANTIDAD') colCant = idx;
      else if (label === 'PROMOCION') colPromo = idx;
    });
  }

  const products = [];

  table.rows.forEach((row, i) => {
    if (!row || !row.c) return;
    const c = row.c;

    const nombreVal = c[colNombre] ? (c[colNombre].v || c[colNombre].f || '') : '';
    if (!nombreVal.toString().trim()) return;

    // Parsear precio: puede venir como número puro o texto
    let precio = 0;
    const precioCell = c[colPrecio];
    if (precioCell) {
      if (typeof precioCell.v === 'number') {
        precio = precioCell.v;
      } else {
        const strVal = (precioCell.v || precioCell.f || '0').toString();
        precio = parseFloat(strVal.replace('$', '').replace(/\s/g, '').replace(',', '.')) || 0;
      }
    }

    // Cantidad / Stock
    let cantidad = 0;
    const cantCell = c[colCant];
    if (cantCell) {
      cantidad = typeof cantCell.v === 'number' ? cantCell.v : (parseInt(cantCell.v || cantCell.f) || 0);
    }

    // Promocion
    let promocion = false;
    const promoCell = c[colPromo];
    if (promoCell) {
      promocion = promoCell.v === true || (promoCell.v || promoCell.f || '').toString().trim().toUpperCase() === 'TRUE';
    }

    const catVal = c[colCat] ? (c[colCat].v || c[colCat].f || 'GENERAL').toString().trim() : 'GENERAL';
    const marcaVal = c[colMarca] ? (c[colMarca].v || c[colMarca].f || 'GENÉRICO').toString().trim() : 'GENÉRICO';
    const descVal = c[colDesc] ? (c[colDesc].v || c[colDesc].f || '').toString().trim() : '';
    const presVal = c[colPres] ? (c[colPres].v || c[colPres].f || '100 ML').toString().trim() : '100 ML';
    const imgVal = c[colImg] ? (c[colImg].v || c[colImg].f || '').toString().trim() : '';

    const masVendido = cantidad >= 3 || promocion;

    products.push({
      id: i + 1,
      categoria: catVal,
      marca: marcaVal,
      nombre: nombreVal.toString().trim(),
      descripcion: descVal,
      presentacion: presVal,
      precio: precio,
      imagen: imgVal,
      cantidad: cantidad,
      promocion: promocion,
      masVendido: masVendido
    });
  });

  return products;
}

/**
 * Parsea la tabla de configuración de Google Visualization API
 */
function parseGvizConfigTable(table) {
  if (!table || !table.rows) return;

  table.rows.forEach(row => {
    if (!row || !row.c || row.c.length < 2) return;
    const key = (row.c[0]?.v || row.c[0]?.f || '').toString().trim().toLowerCase();
    const val = (row.c[1]?.v || row.c[1]?.f || '').toString().trim();

    if (key === 'whatsapp' && val) AppState.config.whatsapp = val.replace(/\D/g, '');
    if (key === 'nombre' && val) AppState.config.nombre = val;
    if (key === 'telefono' && val) AppState.config.telefono = val;
    if ((key === 'dirección' || key === 'direccion') && val) AppState.config.direccion = val;
  });

  localStorage.setItem('zafiro_config', JSON.stringify(AppState.config));
  renderHeaderConfig();
}

/**
 * Parsea el CSV de configuración de Google Sheets
 */
function parseConfigCSV(csvText) {
  const lines = csvText.split(/\r\n|\n/);
  lines.forEach(line => {
    if (!line.trim()) return;
    const parts = line.split(',');
    const key = parts[0] ? parts[0].trim().toLowerCase() : '';
    const val = parts.slice(1).join(',').trim();

    if (key === 'whatsapp' && val) AppState.config.whatsapp = val.replace(/\D/g, '');
    if (key === 'nombre' && val) AppState.config.nombre = val;
    if (key === 'telefono' && val) AppState.config.telefono = val;
    if (key === 'dirección' || key === 'direccion' && val) AppState.config.direccion = val;
  });

  localStorage.setItem('zafiro_config', JSON.stringify(AppState.config));
  renderHeaderConfig();
}

/**
 * Parsea el CSV de productos de Google Sheets de manera segura (maneja comillas y saltos)
 */
function parseProductsCSV(csvText) {
  const rows = parseCSVtoRows(csvText);
  if (rows.length < 2) return null;

  const header = rows[0].map(h => h.trim().toUpperCase());
  const colCat = header.indexOf('CATEGORIA');
  const colMarca = header.indexOf('MARCA');
  const colNombre = header.indexOf('NOMBRE');
  const colDesc = header.indexOf('DESCRIPCION');
  const colPres = header.indexOf('PRESENTACION');
  const colPrecio = header.indexOf('PRECIO');
  const colImg = header.indexOf('IMAGEN');
  const colCant = header.indexOf('CANTIDAD');
  const colPromo = header.indexOf('PROMOCION');

  const products = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length <= 2 || !r[colNombre]) continue;

    // Parsear precio: admite "68,24" o "68.24"
    let rawPrecio = (r[colPrecio] || '0').toString().replace('$', '').replace(/\s/g, '').replace(',', '.');
    let precio = parseFloat(rawPrecio) || 0;

    let cantidad = parseInt(r[colCant]) || 0;
    let promo = (r[colPromo] || '').toString().trim().toUpperCase() === 'TRUE';

    // Determinar si es "Más Vendido"
    const masVendido = cantidad >= 3 || promo;

    products.push({
      id: i,
      categoria: (r[colCat] || 'GENERAL').trim(),
      marca: (r[colMarca] || 'GENÉRICO').trim(),
      nombre: (r[colNombre] || '').trim(),
      descripcion: (r[colDesc] || '').trim(),
      presentacion: (r[colPres] || '100 ML').trim(),
      precio: precio,
      imagen: (r[colImg] || '').trim(),
      cantidad: cantidad,
      promocion: promo,
      masVendido: masVendido
    });
  }

  return products;
}

/**
 * Parser de CSV para JavaScript que maneja comillas y comas internas
 */
function parseCSVtoRows(text) {
  const p = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    let next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      p.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }

  if (row.length > 1 || row[0] !== '') {
    p.push(row);
  }

  return p;
}

/**
 * Convierte URL de Google Drive a URL directa de imagen web
 */
function formatImageUrl(driveUrl, width = 600) {
  if (!driveUrl) {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="%23d4af37"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
  }

  // Extraer ID de archivo de Google Drive
  const match = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    const fileId = match[1];
    // Googleusercontent thumbnail URL de alto rendimiento
    return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
  }

  return driveUrl;
}

// ==========================================================================
// RENDERIZADO DE LA INTERFAZ
// ==========================================================================
function renderApp() {
  renderHeaderConfig();
  renderBrandFilters();
  renderCatalog();
  updateCartBadge();
}

function renderHeaderConfig() {
  const titleEl = document.getElementById('store-name');
  const subtitleEl = document.getElementById('store-slogan');
  const waBtn = document.getElementById('btn-header-whatsapp');

  if (titleEl) {
    // Formato con primera palabra en blanco y segunda en oro
    const parts = (AppState.config.nombre || 'Zafiro Perfumería').split(' ');
    if (parts.length > 1) {
      titleEl.innerHTML = `${parts[0]} <span>${parts.slice(1).join(' ')}</span>`;
    } else {
      titleEl.textContent = AppState.config.nombre;
    }
  }

  if (subtitleEl) {
    subtitleEl.textContent = AppState.config.eslogan || 'Esencia que te inspira';
  }

  if (waBtn) {
    waBtn.href = `https://wa.me/${cleanPhone(AppState.config.whatsapp)}?text=${encodeURIComponent('¡Hola ' + AppState.config.nombre + '! Quisiera información sobre sus fragancias.')}`;
  }
}

/**
 * Renderiza los chips de marcas
 */
function renderBrandFilters() {
  const container = document.getElementById('brand-filters-container');
  if (!container) return;

  const brands = Array.from(new Set(AppState.products.map(p => p.marca))).filter(Boolean).sort();
  
  let html = `<button class="brand-pill ${AppState.currentBrand === 'TODOS' ? 'active' : ''}" onclick="setBrandFilter('TODOS')">Todas las Marcas</button>`;
  
  brands.forEach(b => {
    html += `<button class="brand-pill ${AppState.currentBrand === b ? 'active' : ''}" onclick="setBrandFilter('${escapeHtml(b)}')">${escapeHtml(b)}</button>`;
  });

  container.innerHTML = html;
}

/**
 * Renderiza la cuadrícula de productos (2 columnas idéntica a la imagen)
 */
function renderCatalog() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (AppState.filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-catalog">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <p><strong>No se encontraron fragancias</strong></p>
        <p style="font-size:0.8rem; margin-top:4px;">Intenta con otra búsqueda o categoría</p>
        <button class="hero-cta" style="margin-top:14px; font-size:0.75rem;" onclick="resetAllFilters()">Ver Todo el Catálogo</button>
      </div>
    `;
    return;
  }

  let html = '';
  AppState.filteredProducts.forEach(prod => {
    const isOutStock = prod.cantidad <= 0;
    const imgUrl = formatImageUrl(prod.imagen, 500);

    // Etiqueta superior
    let badgeHtml = '';
    if (isOutStock) {
      badgeHtml = `<div class="badge-tag badge-outstock">Agotado</div>`;
    } else if (prod.promocion) {
      badgeHtml = `<div class="badge-tag badge-offer">🔥 Oferta</div>`;
    } else if (prod.masVendido) {
      badgeHtml = `<div class="badge-tag badge-bestseller">👑 Más Vendido</div>`;
    }

    html += `
      <div class="product-card" onclick="openProductModal(${prod.id})">
        ${badgeHtml}
        <div class="product-image-wrap">
          <img 
            src="${imgUrl}" 
            alt="${escapeHtml(prod.nombre)}" 
            class="product-img" 
            loading="lazy"
            onerror="this.onerror=null; this.src='https://drive.google.com/thumbnail?id=${extractDriveId(prod.imagen)}&sz=w500';"
          />
        </div>
        <div class="product-info">
          <span class="product-brand">${escapeHtml(prod.marca)}</span>
          <h3 class="product-name">${escapeHtml(prod.nombre)}</h3>
          <span class="product-presentation">${escapeHtml(prod.presentacion)}</span>
          <div class="product-bottom-row">
            <span class="product-price">$${prod.precio.toFixed(2)}</span>
            <button 
              class="btn-add-cart-mini ${isOutStock ? 'disabled' : ''}" 
              title="${isOutStock ? 'Agotado' : 'Añadir al carrito'}"
              onclick="event.stopPropagation(); ${isOutStock ? "showToast('Fragancia agotada actualmente')" : `addToCart(${prod.id})`}"
            >
              🛒
            </button>
          </div>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

// ==========================================================================
// FILTROS Y BÚSQUEDA
// ==========================================================================
function applyFilters() {
  let list = [...AppState.products];

  // Filtro por categoría principal
  if (AppState.currentCategory === 'CABALLEROS') {
    list = list.filter(p => p.categoria.toUpperCase().includes('CABALLERO') || p.categoria.toUpperCase().includes('HOMBRE'));
  } else if (AppState.currentCategory === 'DAMAS') {
    list = list.filter(p => p.categoria.toUpperCase().includes('DAMA') || p.categoria.toUpperCase().includes('MUJER'));
  } else if (AppState.currentCategory === 'MAS_VENDIDOS') {
    list = list.filter(p => p.masVendido);
  } else if (AppState.currentCategory === 'OFERTAS') {
    list = list.filter(p => p.promocion || p.precio < 30);
  }

  // Filtro por marca
  if (AppState.currentBrand !== 'TODOS') {
    list = list.filter(p => p.marca.toUpperCase() === AppState.currentBrand.toUpperCase());
  }

  // Filtro por búsqueda de texto
  if (AppState.searchQuery.trim() !== '') {
    const q = AppState.searchQuery.toLowerCase().trim();
    list = list.filter(p => 
      p.nombre.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      p.presentacion.toLowerCase().includes(q)
    );
  }

  AppState.filteredProducts = list;
}

function setCategoryFilter(category) {
  AppState.currentCategory = category;
  
  // Actualizar botones visuales
  document.querySelectorAll('.cat-card').forEach(card => {
    card.classList.toggle('active', card.dataset.category === category);
  });

  applyFilters();
  renderCatalog();
}

function setBrandFilter(brand) {
  AppState.currentBrand = brand;
  renderBrandFilters();
  applyFilters();
  renderCatalog();
}

function resetAllFilters() {
  AppState.currentCategory = 'TODOS';
  AppState.currentBrand = 'TODOS';
  AppState.searchQuery = '';
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.cat-card').forEach(card => {
    card.classList.toggle('active', card.dataset.category === 'TODOS');
  });

  renderBrandFilters();
  applyFilters();
  renderCatalog();
}

// ==========================================================================
// MODAL DE DETALLES DEL PRODUCTO (Idéntico a la pantalla derecha del diseño)
// ==========================================================================
function openProductModal(productId) {
  const prod = AppState.products.find(p => p.id === productId);
  if (!prod) return;

  AppState.selectedProduct = prod;

  const modal = document.getElementById('product-modal');
  const showcaseImg = document.getElementById('modal-showcase-img');
  const brandEl = document.getElementById('modal-product-brand');
  const titleEl = document.getElementById('modal-product-title');
  const subtitleEl = document.getElementById('modal-product-subtitle');
  const priceEl = document.getElementById('modal-product-price');
  const descEl = document.getElementById('modal-product-desc');
  const buyWaBtn = document.getElementById('modal-btn-wa');
  const addCartBtn = document.getElementById('modal-btn-cart');

  const imgUrl = formatImageUrl(prod.imagen, 800);
  showcaseImg.src = imgUrl;
  showcaseImg.alt = prod.nombre;

  brandEl.textContent = prod.marca;
  titleEl.textContent = prod.nombre;
  subtitleEl.textContent = `${prod.categoria === 'CABALLEROS' ? 'Para Él' : 'Para Ella'} • ${prod.presentacion}`;
  priceEl.textContent = `$${prod.precio.toFixed(2)}`;
  
  // Descripción completa de Google Sheets
  descEl.textContent = prod.descripcion || 'Una fragancia elegante, refinada y con personalidad única de alta duración.';

  // Acción directa WhatsApp
  const waMsg = `¡Hola! Me interesa comprar esta fragancia:
*${prod.nombre}* (${prod.marca})
Presentación: ${prod.presentacion}
Precio: $${prod.precio.toFixed(2)}
¿Tienen disponibilidad para envío inmediato?`;

  buyWaBtn.onclick = () => {
    window.open(`https://wa.me/${cleanPhone(AppState.config.whatsapp)}?text=${encodeURIComponent(waMsg)}`, '_blank');
  };

  // Botón agregar al carrito
  if (prod.cantidad <= 0) {
    addCartBtn.textContent = '⚠️ Fragancia Agotada';
    addCartBtn.disabled = true;
    addCartBtn.style.opacity = '0.5';
  } else {
    addCartBtn.textContent = '🛒 Agregar al Carrito';
    addCartBtn.disabled = false;
    addCartBtn.style.opacity = '1';
    addCartBtn.onclick = () => {
      addToCart(prod.id);
      closeProductModal();
    };
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * Compartir producto en WhatsApp o redes
 */
function shareProduct() {
  if (!AppState.selectedProduct) return;
  const p = AppState.selectedProduct;
  const text = `¡Mira esta fragancia en ${AppState.config.nombre}! ${p.nombre} (${p.marca}) por $${p.precio.toFixed(2)}`;
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({
      title: `${p.nombre} - ${AppState.config.nombre}`,
      text: text,
      url: url
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${text} - ${url}`);
    showToast('¡Enlace de fragancia copiado al portapapeles!');
  }
}

// ==========================================================================
// CARRITO DE COMPRAS Y PEDIDOS POR WHATSAPP
// ==========================================================================
function addToCart(productId) {
  const prod = AppState.products.find(p => p.id === productId);
  if (!prod) return;

  if (prod.cantidad <= 0) {
    showToast('Esta fragancia se encuentra agotada');
    return;
  }

  const existing = AppState.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    AppState.cart.push({
      id: prod.id,
      nombre: prod.nombre,
      marca: prod.marca,
      presentacion: prod.presentacion,
      precio: prod.precio,
      imagen: prod.imagen,
      quantity: 1
    });
  }

  saveCart();
  updateCartBadge();
  showToast(`¡"${prod.nombre}" añadido al carrito!`);
}

function updateCartQuantity(productId, delta) {
  const item = AppState.cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  renderCartDrawer();
  updateCartBadge();
}

function removeFromCart(productId) {
  AppState.cart = AppState.cart.filter(i => i.id !== productId);
  saveCart();
  renderCartDrawer();
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem('zafiro_cart', JSON.stringify(AppState.cart));
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);

  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

function openCartDrawer() {
  renderCartDrawer();
  const drawer = document.getElementById('cart-drawer');
  if (drawer) drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) drawer.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const totalValEl = document.getElementById('cart-total-value');
  const formSection = document.getElementById('cart-form-section');
  const checkoutBtn = document.getElementById('btn-checkout-wa');

  if (!container) return;

  if (AppState.cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
        <p><strong>Tu carrito está vacío</strong></p>
        <p style="font-size:0.8rem; margin-top:4px;">Explora el catálogo y añade tus perfumes favoritos</p>
      </div>
    `;
    if (totalValEl) totalValEl.textContent = '$0.00';
    if (formSection) formSection.style.display = 'none';
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = '0.5';
    }
    return;
  }

  if (formSection) formSection.style.display = 'block';
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = '1';
  }

  let total = 0;
  let html = '';

  AppState.cart.forEach(item => {
    const itemSubtotal = item.precio * item.quantity;
    total += itemSubtotal;
    const imgUrl = formatImageUrl(item.imagen, 150);

    html += `
      <div class="cart-item">
        <img src="${imgUrl}" alt="${escapeHtml(item.nombre)}" class="cart-item-img" />
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.nombre)}</div>
          <div class="cart-item-sub">${escapeHtml(item.marca)} • ${escapeHtml(item.presentacion)}</div>
          <div class="cart-item-price">$${item.precio.toFixed(2)} c/u</div>
        </div>
        <div class="cart-item-controls">
          <button class="btn-qty" onclick="updateCartQuantity(${item.id}, -1)">-</button>
          <span class="cart-qty-num">${item.quantity}</span>
          <button class="btn-qty" onclick="updateCartQuantity(${item.id}, 1)">+</button>
          <button class="btn-cart-remove" onclick="removeFromCart(${item.id})" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (totalValEl) totalValEl.textContent = `$${total.toFixed(2)}`;
}

/**
 * Genera y envía el pedido formateado por WhatsApp
 */
function sendOrderToWhatsApp() {
  if (AppState.cart.length === 0) {
    showToast('Tu carrito está vacío');
    return;
  }

  // Validar campos del formulario
  const clientName = (document.getElementById('order-name')?.value || '').trim();
  const clientPhone = (document.getElementById('order-phone')?.value || '').trim();
  const clientAddress = (document.getElementById('order-address')?.value || '').trim();
  const deliveryType = document.getElementById('order-delivery')?.value || 'Envío a domicilio';
  const paymentMethod = document.getElementById('order-payment')?.value || 'Pago Móvil';
  const clientNotes = (document.getElementById('order-notes')?.value || '').trim();

  if (!clientName) {
    showToast('Por favor escribe tu Nombre y Apellido');
    document.getElementById('order-name')?.focus();
    return;
  }

  let total = 0;
  let itemsText = '';

  AppState.cart.forEach(item => {
    const sub = item.precio * item.quantity;
    total += sub;
    itemsText += `• ${item.quantity}x *${item.nombre}* (${item.marca} - ${item.presentacion})\n  Precio: $${item.precio.toFixed(2)} | Subtotal: $${sub.toFixed(2)}\n`;
  });

  let message = `👋 *¡HOLA ${AppState.config.nombre.toUpperCase()}! QUIERO REALIZAR UN PEDIDO:*\n\n`;
  message += `🛍️ *DETALLE DE PRODUCTOS:*\n`;
  message += `${itemsText}\n`;
  message += `💰 *TOTAL A PAGAR: $${total.toFixed(2)} USD*\n\n`;
  message += `📋 *DATOS PARA LA ENTREGA:*\n`;
  message += `• *Cliente:* ${clientName}\n`;
  if (clientPhone) message += `• *Teléfono:* ${clientPhone}\n`;
  if (clientAddress) message += `• *Dirección/Ciudad:* ${clientAddress}\n`;
  message += `• *Método de Entrega:* ${deliveryType}\n`;
  message += `• *Método de Pago:* ${paymentMethod}\n`;
  if (clientNotes) message += `• *Notas:* ${clientNotes}\n`;
  message += `\n✨ _Quedo atento(a) para la confirmación de disponibilidad y datos de pago._ ¡Muchas gracias!`;

  const phone = cleanPhone(AppState.config.whatsapp);
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  // Abrir WhatsApp en nueva pestaña
  window.open(waUrl, '_blank');

  // Vaciar carrito tras confirmación
  showToast('¡Redirigiendo a WhatsApp con tu pedido!');
  setTimeout(() => {
    AppState.cart = [];
    saveCart();
    renderCartDrawer();
    updateCartBadge();
    closeCartDrawer();
  }, 1000);
}

// ==========================================================================
// MODAL DE CONFIGURACIÓN / TELÉFONO WHATSAPP
// ==========================================================================
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const inputWa = document.getElementById('setting-wa-input');
  const inputName = document.getElementById('setting-name-input');

  if (inputWa) inputWa.value = AppState.config.whatsapp || '';
  if (inputName) inputName.value = AppState.config.nombre || '';

  if (modal) modal.classList.add('open');
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('open');
}

function saveSettings() {
  const inputWa = document.getElementById('setting-wa-input');
  const inputName = document.getElementById('setting-name-input');

  if (inputWa) AppState.config.whatsapp = inputWa.value.replace(/\D/g, '');
  if (inputName && inputName.value.trim()) AppState.config.nombre = inputName.value.trim();

  localStorage.setItem('zafiro_config', JSON.stringify(AppState.config));
  renderHeaderConfig();
  closeSettingsModal();
  showToast('Configuración guardada exitosamente');
}

// ==========================================================================
// EVENT LISTENERS & UTILIDADES
// ==========================================================================
function initEventListeners() {
  // Búsqueda en vivo
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('search-clear-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = AppState.searchQuery ? 'block' : 'none';
      }
      applyFilters();
      renderCatalog();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      AppState.searchQuery = '';
      clearSearchBtn.style.display = 'none';
      applyFilters();
      renderCatalog();
    });
  }

  // Cerrar modales con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCartDrawer();
      closeSettingsModal();
    }
  });
}

function updateSyncStatus(text, color) {
  const textEl = document.getElementById('sync-status-text');
  const dotEl = document.getElementById('sync-status-dot');
  if (textEl) textEl.textContent = text;
  if (dotEl) {
    dotEl.style.backgroundColor = color;
    dotEl.style.boxShadow = `0 0 6px ${color}`;
  }
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function cleanPhone(phone) {
  if (!phone) return '584120000000';
  return phone.toString().replace(/\D/g, '');
}

function extractDriveId(url) {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
