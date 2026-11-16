# ICB: dirección separada para WordPress antiguo

Aplicado en producción el 16 de noviembre de 2026. No requiere reconstruir ni desplegar la aplicación Next/SGI.

## Resultado

- Tienda actual: https://icbtechscr.com/ y https://www.icbtechscr.com/.
- WordPress antiguo: https://anterior.icbtechscr.com/.
- SGI: https://sgi.icbtechscr.com/ (acceso autenticado existente).

## Configuración aplicada

1. DirectAdmin, dominio icbtechscr.com: subdominio `anterior`, DocumentRoot `/domains/icbtechscr.com/public_html`, reutilizando los archivos y la base de datos existentes. No se clonó el sitio; el alojamiento está por encima de su cuota.
2. Cloudflare: un registro A `anterior` → `51.222.105.179`, DNS only, TTL Auto. Se verificó HTTPS con certificado válido para ese nombre; el certificado comodín existente se aplicó al nuevo vhost tras el procesamiento de DirectAdmin. No se desactivó ninguna validación TLS.
3. `wp-config.php`: las dos constantes del archivo `wp-config-url.inc.php`, antes de cargar WordPress. El archivo con credenciales no se incluye en Git.
4. `wp-content/mu-plugins/icb-legacy-url.php`: traducción de enlaces y recursos absolutos del dominio anterior al subdominio. Cambia la salida HTML, las URL de adjuntos y las redirecciones de WordPress; no modifica datos comerciales ni hace reemplazos en la base de datos. No se modifican respuestas binarias/no HTML.
5. Al principio de `.htaccess`: bloque de `legacy-root-redirect.conf`. Las visitas al dominio raíz que aún alcanzan el servidor viejo se envían por HTTP 302 a `www`, preservando ruta y consulta; se excluye ACME. El subdominio `anterior` no coincide con esa regla.
6. Zona DNS antigua de Neothek: se sustituyó únicamente `www CNAME icbtechscr.com.` por `www A 104.21.49.91` y `www A 172.67.189.113`, ambos TTL 300. Es una mitigación temporal para resolutores que conservan la delegación antigua; Cloudflare sigue siendo la autoridad vigente. Las IP se verificaron con Host/SNI de `www` y TLS estricto antes de aplicarlas.
7. Se conservó el A raíz antiguo (`51.222.105.179`), porque el MX antiguo apunta al mismo nombre. No se alteraron MX, SPF, mail, buzones, delegación vigente ni test.

DirectAdmin agregó también los registros correspondientes al nuevo subdominio en su zona antigua. Se desmarcó Duplicate to pointers al modificar `www`.

## Verificación

`verification-summary.json` contiene las comprobaciones finales con fecha UTC y validación TLS normal: HTTP 200 para la tienda raíz, www, WordPress, Nosotros, un producto y el inicio de sesión SGI. Las tres páginas de WordPress permanecieron en `anterior` sin enlaces href/src absolutos dirigidos al dominio principal. Se revisó visualmente el sitio con sus imágenes, estilos y navegación.

Ambos servidores antiguos (`51.222.105.179` y `51.161.108.91`) ya devuelven las dos IP de Cloudflare para www; su MX y A raíz siguen intactos. Los clientes con respuestas DNS anteriores todavía pueden necesitar agotar su caché. No se garantiza el plazo de cada proveedor.

No se probaron compras ni pagos en WordPress; no se realizaron pedidos de prueba. Esta publicación conserva el acceso a la web anterior.

## Respaldo y reversión

Antes de tocar DNS se guardaron exportaciones de Cloudflare y la tabla DNS antigua. Los originales completos de wp-config.php y .htaccess se descargaron a un respaldo privado local fuera del repositorio. Las evidencias locales están en `evidence/icb-legacy-link-20261116` del workspace operativo; no contienen contraseñas en el informe.

Para revertir la adaptación de WordPress: restaurar los dos archivos originales desde ese respaldo privado y desactivar el archivo MU específico; no sobrescribir otros plugins ni la base de datos. Reponer el DNS www anterior únicamente si deliberadamente se desea volver a servir la web vieja a los resolutores antiguos. No cambiar el MX ni el A raíz como parte de esa reversión.
