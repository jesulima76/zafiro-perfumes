# 💎 Instructivo de Implementación y Uso: Zafiro Perfumes

Este instructivo te guiará paso a paso para poner en marcha, personalizar y publicar en internet la tienda online de **Zafiro Perfumes** conectada a tu base de datos en Google Sheets y con envío de pedidos directos a WhatsApp.

---

## 📁 1. Estructura de Archivos del Proyecto

Los archivos generados en la carpeta del proyecto son:

| Archivo | Función |
| :--- | :--- |
| **`index.html`** | Estructura visual de la tienda (Encabezado de lujo, banner hero, filtros de categorías y marcas, catálogo en 2 columnas, modal de detalles de fragancia, carrito deslizable y barra inferior de navegación). |
| **`style.css`** | Diseño estético idéntico a la imagen de referencia (paleta Midnight Black, acentos dorados de alta gama, verde esmeralda WhatsApp, tipografía de lujo y diseño 100% responsivo para celulares y computadoras). |
| **`app.js`** | Lógica de la aplicación: sincronización en vivo con Google Sheets, procesamiento del carrito, cálculo de totales, formateo del mensaje de pedido para WhatsApp y gestión de filtros. |
| **`initial-data.js`** | Copia base de los 33 productos y configuración para que la tienda cargue de inmediato incluso si la conexión a internet está lenta o en pruebas locales. |
| **`manifest.json`** | Permite que los clientes puedan instalar la tienda en su celular como una App nativa (PWA). |
| **`productos.csv`** / **`config.csv`** | Respaldos locales de las hojas de Google Sheets. |

---

## ⚡ 2. Cómo Probar la Tienda en tu Computadora (Local)

1. Abre el explorador de archivos de Windows en la carpeta:
   `c:\Users\egyven\APLICACIONES\Zafiro Perfumes`
2. Haz doble clic sobre el archivo **`index.html`** para abrirlo en tu navegador favorito (Google Chrome, Microsoft Edge, Firefox o Brave).
3. ¡Listo! Verás el catálogo completo con las 33 fragancias, podrás filtrar por Damas/Caballeros/Ofertas, buscar por marca, abrir el detalle de cada perfume, agregarlos al carrito y probar el envío de pedidos por WhatsApp.

---

## 🌐 3. Cómo Publicar la Tienda en Internet GRATIS (En 2 Minutos)

Para que tus clientes puedan entrar a la tienda desde cualquier parte del mundo con un enlace web (ejemplo: `https://zafiro-perfumes.netlify.app`), puedes usar cualquiera de estos métodos gratuitos:

### Opción A: Netlify Drop (La más fácil y rápida - Sin programar)
1. Entra a [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. Si no tienes cuenta, crea una gratis con tu correo o cuenta de Google.
3. Arrastra la carpeta completa **`Zafiro Perfumes`** a la ventana de Netlify Drop.
4. En 10 segundos te entregará un enlace público HTTPS seguro y gratis.
5. Puedes cambiar el nombre del enlace en *Site Settings > Domain management*.

### Opción B: GitHub Pages
1. Sube los archivos a un repositorio en [GitHub](https://github.com).
2. Ve a la pestaña **Settings** > **Pages**.
3. En *Source*, selecciona la rama `main` (o `master`) y guarda.
4. Tu tienda quedará publicada en `https://tu-usuario.github.io/tu-repositorio`.

### Opción C: Vercel o Cloudflare Pages
1. Ambas plataformas permiten arrastrar la carpeta o vincularla con GitHub de forma 100% gratuita con soporte de dominio personalizado.

---

## 📊 4. Cómo Gestionar tu Base de Datos en Google Drive / Google Sheets

Tu tienda lee los datos en vivo desde tu archivo de Google Drive:
- **ID del archivo:** `1dNLzAn3_pLI95Us6S7TYoYVyqHDu1HZ5MTrFoRbjVAo`
- **Hoja 1 (Productos):** `gid=0`
- **Hoja 2 (Configuración):** `gid=934150705`

### A. Para Modificar Precios, Stock o Nombres
1. Abre tu hoja en Google Sheets.
2. Si un perfume se agotó, pon `0` en la columna **`Cantidad`**. La tienda mostrará automáticamente la etiqueta **"Agotado"** y deshabilitará el botón de compra.
3. Si cambias un precio (ejemplo: de `68,24` a `68,00`), la tienda lo reflejará en vivo de inmediato al abrir la app, o al pulsar el botón **"🔄 Actualizar"** en la barra superior.
4. Si quieres destacar un perfume en la sección de ofertas, pon **`TRUE`** en la columna **`Promocion`**.

> 💡 **Sincronización en Tiempo Real:** La aplicación utiliza el motor en vivo de Google Sheets (Google Visualization API mediante JSONP). Esto significa que **no tienes que esperar los 5 a 15 minutos de caché** que normalmente tiene la opción "Publicar en la web" de Google, y funciona tanto si abres el archivo localmente como si está publicado en internet. Además, la aplicación verifica automáticamente cada 60 segundos si hubo cambios en la hoja.

### B. Para Agregar Nuevas Fragancias
Inserta una nueva fila respetando las columnas:
- **`CATEGORIA`**: `CABALLEROS` o `DAMAS`
- **`MARCA`**: Ejemplo `DIOR`, `CHANEL`, `CAROLINA HERRERA`
- **`NOMBRE`**: Nombre de la fragancia (ej: `BLEU DE CHANEL`)
- **`DESCRIPCION`**: Breve descripción de sus notas aromáticas
- **`PRESENTACION`**: Ejemplo `100 ML` o `50 ML`
- **`PRECIO`**: El precio en dólares (puedes usar coma o punto, ej: `65,00`)
- **`IMAGEN`**: Enlace del archivo en Google Drive (ver paso 5)
- **`Cantidad`**: Stock disponible en número (ej: `3`)
- **`Promocion`**: `FALSE` o `TRUE`

---

## 🖼️ 5. Cómo Subir y Vincular Nuevas Imágenes desde Google Drive

Las imágenes de tus perfumes están organizadas en tu carpeta de Google Drive:
👉 [Carpeta de Imágenes en Google Drive](https://drive.google.com/drive/folders/1JlX8bBtf-gHj_iHuzvkljOHmEtdOy-f9?usp=drive_link)

Para añadir una foto nueva a un producto:
1. Sube la foto del perfume a la carpeta de Google Drive.
2. Haz clic derecho sobre la foto > **Compartir** > **Compartir**.
3. En *Acceso general*, asegúrate de que esté seleccionado:
   **"Cualquier persona con el enlace"** en modo **Lector**.
4. Haz clic en **Copiar enlace**.
5. Pega ese enlace en la columna **`IMAGEN`** de la fila correspondiente en Google Sheets.
6. La aplicación web convierte automáticamente ese enlace para mostrar la imagen en alta definición y con carga ultra-rápida.

---

## 📲 6. Cómo Configurar tu Número de WhatsApp para Recibir los Pedidos

Para que todos los pedidos lleguen a tu número de WhatsApp:

### Método 1: Desde la Hoja de Google Sheets (Recomendado)
1. Abre la pestaña **`config`** (`gid=934150705`) en tu Google Sheet.
2. En la celda al lado de `Whatsapp`, coloca tu número con el código internacional (sin el signo `+` ni espacios).
   - Ejemplo para Venezuela: `584121234567` o `584149876543`
   - Ejemplo para Colombia: `573001234567`
3. ¡Listo! Cualquier cambio allí se actualizará automáticamente en la web.

### Método 2: Desde la Tienda Web (Panel Rápido)
1. En la esquina superior derecha de la tienda, pulsa el botón de opciones (los 3 puntos verticales `⋮`).
2. Escribe tu número de WhatsApp en la casilla correspondiente.
3. Haz clic en **Guardar Cambios**.

---

## 🛍️ 7. Experiencia de Compra del Cliente y Envío a WhatsApp

1. **Exploración:** El cliente entra a la tienda, filtra por Caballeros/Damas o escribe en la barra de búsqueda (ej: "Boss" o "Dior").
2. **Detalles:** Al tocar cualquier fragancia, se abre el modal de lujo con la foto ampliada, precio destacado en verde, descripción olfativa y garantía de larga duración.
3. **Carrito de Compras:** Puede agregar varios perfumes pulsando el botón verde `🛒`. La barra inferior muestra el contador en tiempo real.
4. **Checkout:** Al abrir **"Mi Pedido"**, el cliente ve la lista, puede sumar o restar cantidades, e introduce sus datos:
   - Nombre y Apellido
   - Teléfono
   - Dirección de entrega
   - Método de Entrega (MRW/Zoom, Delivery local o retiro)
   - Método de Pago (Pago Móvil, Zelle, Transferencia, Dólares efectivo, Binance)
5. **Envío por WhatsApp:** Al presionar **"Enviar Pedido por WhatsApp"**, la tienda abre WhatsApp con un mensaje estructurado y listo para enviar:

```text
👋 *¡HOLA ZAFIRO PERFUMERÍA! QUIERO REALIZAR UN PEDIDO:*

🛍️ *DETALLE DE PRODUCTOS:*
• 1x *212 MEN* (CAROLINA HERRERA - 100 ML)
  Precio: $68.24 | Subtotal: $68.24
• 1x *BURBERRY TOUCH* (BURBERRY - 100 ML)
  Precio: $33.75 | Subtotal: $33.75

💰 *TOTAL A PAGAR: $101.99 USD*

📋 *DATOS PARA LA ENTREGA:*
• *Cliente:* Carlos Mendoza
• *Teléfono:* 0412-1234567
• *Dirección/Ciudad:* San Diego, Carabobo
• *Método de Entrega:* Envío Nacional (MRW / Zoom / Tealca)
• *Método de Pago:* Pago Móvil
• *Notas:* Enviar por favor a la agencia MRW San Diego

✨ Quedo atento(a) para la confirmación de disponibilidad y datos de pago. ¡Muchas gracias!
```

---

## 🔒 8. Ventajas de esta Arquitectura

- **Cero Costos de Servidor:** No requiere bases de datos caras ni servidores backend; Google Sheets actúa como tu panel de control administrativo gratuito.
- **Tiempo Real:** Administras stock y precios desde tu celular o computadora simplemente editando tu hoja de cálculo.
- **Ultra Liviano:** Carga instantáneamente en cualquier celular 3G/4G/5G.
- **Sin Comisiones:** Los pedidos van directamente a tu WhatsApp, permitiéndote cerrar la venta y acordar el pago de forma personalizada.
