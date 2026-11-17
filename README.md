# 💎 Zafiro Perfumes - Tienda Online & Pedidos por WhatsApp

Aplicación web responsiva de comercio electrónico para perfumería de alta gama (Midnight Dark & Gold Luxury), conectada en **tiempo real** con **Google Sheets** como base de datos y envío de pedidos estructurados directamente a **WhatsApp**.

---

## 🚀 Características

- **Diseño de Lujo Mobile-First:** Inspirado en tiendas de perfumería exclusivas con paleta Midnight Black (`#0d111a`), acentos dorados (`#d4af37`) y verde esmeralda de WhatsApp (`#25d366`).
- **Base de Datos en Google Sheets en Tiempo Real:** 
  - Conexión directa mediante Google Visualization API (JSONP).
  - Cero retraso de caché: los cambios en precios, stock o nuevos perfumes se reflejan al instante.
  - Verificación automática en segundo plano cada 60 segundos.
- **Catálogo Interactivo:**
  - Filtros rápidos: *Más Vendidos*, *Ofertas Especiales*, *Para Él (Caballeros)* y *Para Ella (Damas)*.
  - Buscador predictivo en vivo por perfume, marca o notas olfativas.
  - Filtro deslizable por marcas (*Carolina Herrera, Hugo Boss, Dior, Givenchy, etc.*).
  - Modal de detalles con fotos de alta definición desde Google Drive, descripción completa y puntos de garantía.
- **Carrito de Compras y Checkout a WhatsApp:**
  - Carrito deslizable con persistencia en `localStorage`.
  - Control de cantidades y verificación de stock agotado.
  - Formulario de datos de cliente, dirección de entrega, método de envío (MRW/Zoom/Delivery) y forma de pago (Pago Móvil, Zelle, Transferencia, Dólares, Binance).
  - Generación de mensaje formateado con emojis listo para enviar a WhatsApp con un solo clic.
- **PWA Ready:** Incluye `manifest.json` para que los clientes puedan instalarla en la pantalla de inicio de su teléfono como una app nativa.

---

## 📁 Estructura del Repositorio

```text
├── index.html        # Página principal de la tienda (Inicio de GitHub Pages)
├── style.css         # Estilos visuales de lujo y diseño responsivo
├── app.js            # Lógica de la app, carrito y sincronización con Google Sheets
├── initial-data.js   # Datos base de respaldo de las 33 fragancias
├── manifest.json     # Manifiesto para instalación como App móvil (PWA)
├── INSTRUCTIVO.md    # Manual paso a paso de uso y administración
└── README.md         # Documentación del proyecto
```

---

## 🌐 Despliegue en GitHub Pages

1. Sube estos archivos a tu repositorio de GitHub.
2. Ve a la pestaña **Settings** > **Pages**.
3. En la sección **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (o `master`) / `/ (root)`
4. Haz clic en **Save**.
5. En aproximadamente 1 minuto, tu tienda estará disponible públicamente con certificado SSL gratis en:
   `https://tu-usuario.github.io/tu-repositorio/`

---

## 📊 Administración del Inventario

Para actualizar precios, agregar fragancias o gestionar el stock:
1. Edita directamente la hoja de cálculo de Google Drive vinculada.
2. Si un perfume se queda sin stock, coloca `0` en la columna **`Cantidad`** y la web mostrará automáticamente el aviso de **Agotado**.
3. Al presionar el botón **"🔄 Actualizar"** en la barra superior de la tienda, los cambios se cargarán de inmediato.
