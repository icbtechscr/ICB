# ICB: dirección separada para WordPress antiguo

Aplicado en producción el 16 de noviembre de 2026, con una corrección posterior del recorrido por la IP antigua. No requiere reconstruir ni desplegar la aplicación Next/SGI.

## Resultado

- Tienda actual: https://icbtechscr.com/ y https://www.icbtechscr.com/.
- Entrada de contingencia a la misma tienda actual: https://tienda.icbtechscr.com/.
- WordPress antiguo: https://anterior.icbtechscr.com/.
- SGI: https://sgi.icbtechscr.com/ (acceso autenticado existente).

## Configuración aplicada

1. DirectAdmin, dominio icbtechscr.com: subdominio `anterior`, DocumentRoot `/domains/icbtechscr.com/public_html`, reutilizando los archivos y la base de datos existentes. No se clonó el sitio; el alojamiento está por encima de su cuota.
2. Cloudflare: un registro A `anterior` → `51.222.105.179`, DNS only, TTL Auto. Se verificó HTTPS con certificado válido para ese nombre; el certificado comodín existente se aplicó al nuevo vhost tras el procesamiento de DirectAdmin. No se desactivó ninguna validación TLS.
3. `wp-config.php`: las dos constantes del archivo `wp-config-url.inc.php`, antes de cargar WordPress. El archivo con credenciales no se incluye en Git.
4. `wp-content/mu-plugins/icb-legacy-url.php`: aviso visible de sitio anterior con botón a la tienda actual, y traducción de enlaces y recursos absolutos del dominio anterior al subdominio. Cambia la salida HTML, las URL de adjuntos y las redirecciones de WordPress; no modifica datos comerciales ni hace reemplazos en la base de datos. No se modifican respuestas binarias/no HTML.
5. Al principio de `.htaccess`: bloque de `legacy-root-redirect.conf`. Las visitas tanto al dominio raíz como a www que aún alcanzan el servidor viejo se envían por HTTP 302 a `tienda.icbtechscr.com`, preservando ruta y consulta, con Cache-Control no-store; se excluye ACME. El subdominio `anterior` no coincide con esa regla. La primera versión sólo cubría el dominio raíz y dejaba que www recibiera un 301 de WordPress hacia anterior; se reprodujo y corrigió ese recorrido.
6. Zona DNS antigua de Neothek: se sustituyó únicamente `www CNAME icbtechscr.com.` por `www A 104.21.49.91` y `www A 172.67.189.113`, ambos TTL 300. Es una mitigación temporal para resolutores que conservan la delegación antigua; Cloudflare sigue siendo la autoridad vigente. Las IP se verificaron con Host/SNI de `www` y TLS estricto antes de aplicarlas.
7. Cloudflare Tunnel: ruta publicada `tienda.icbtechscr.com` → `http://127.0.0.1:80`, sin reemplazar las cinco rutas existentes y con CNAME proxied creado automáticamente. En Traefik se instaló `/data/coolify/proxy/dynamic/icb-store-transition.yaml`, que asocia ese Host al servicio Docker existente de la tienda, preservando el Host. No se usa proxy por PHP ni se transfieren credenciales a WordPress. Se agregaron también dos A tienda con las mismas IP de Cloudflare y TTL 300 en la zona antigua, sin duplicar a otros dominios.
8. Se conservó el A raíz antiguo (`51.222.105.179`), porque el MX antiguo apunta al mismo nombre. No se alteraron MX, SPF, mail, buzones, delegación vigente ni test.

DirectAdmin agregó también los registros correspondientes al nuevo subdominio en su zona antigua. Se desmarcó Duplicate to pointers al modificar `www`.

## Verificación

`verification-summary.json` contiene las comprobaciones finales con fecha UTC y validación TLS normal: HTTP 200 para la tienda raíz, www, WordPress, Nosotros, un producto y el inicio de sesión SGI. Las tres páginas de WordPress permanecieron en `anterior` sin enlaces href/src absolutos dirigidos al dominio principal. Se revisó visualmente el sitio con sus imágenes, estilos y navegación.

Ambos servidores antiguos (`51.222.105.179` y `51.161.108.91`) ya devuelven las dos IP de Cloudflare para www; su MX y A raíz siguen intactos. Los clientes con respuestas DNS anteriores todavía pueden necesitar agotar su caché. No se garantiza el plazo de cada proveedor.

No se probaron compras ni pagos en WordPress; no se realizaron pedidos de prueba. Esta publicación conserva el acceso a la web anterior.

## Corrección del recorrido que seguía fallando

La verificación inicial confirmó DNS y servicios pero no cubrió el acceso directo a www en la IP antigua. Allí WordPress enviaba un 301 a anterior. No era suficiente afirmar que bastaba esperar DNS. La regla actual detiene ese recorrido antes de WordPress para ambos nombres y usa un hostname nuevo que resuelve en las zonas actual y antigua.

`verification-redirect-fix.json` contiene 12 rutas finales: cuatro combinaciones HTTP/HTTPS y raíz/www forzadas a la IP antigua, una ruta con consulta y un enlace de entrada con consulta; todas terminan en la tienda actual con 200, sin bucles y sin pasar por anterior. Además se probaron las rutas públicas principales, archivo, carrito y SGI. Ambos DNS antiguos confirman los A tienda y conservan MX/A raíz. En navegador se agregó un producto al carrito, se comprobó su presencia y se vació la prueba; no se creó pedido ni se efectuó pago. El botón del aviso en WordPress abre la tienda nueva.

Un navegador que ya haya cacheado el antiguo 301 puede seguir saltando localmente a anterior sin contactar al servidor. No se puede borrar esa caché remota desde Cloudflare. La entrada https://tienda.icbtechscr.com/ permite acceso inmediato; https://icbtechscr.com/?actual=20261116 es otra entrada que evita reutilizar la URL raíz exacta cacheada. La reparación del servidor está verificada; queda la comprobación final desde el dispositivo afectado.

La regla temporal del proxy referencia un servicio Docker de la aplicación de ICB. Si cambia el identificador de esa aplicación en Coolify, debe actualizarse este alias. No rotar tokens ni reemplazar la configuración completa del túnel para retirarlo: eliminar únicamente su ruta y su DNS cuando ya no se requiera.

## Respaldo y reversión

Antes de tocar DNS se guardaron exportaciones de Cloudflare y la tabla DNS antigua. Los originales completos de wp-config.php y .htaccess se descargaron a un respaldo privado local fuera del repositorio. Las evidencias locales están en `evidence/icb-legacy-link-20261116` del workspace operativo; no contienen contraseñas en el informe.

Para revertir la adaptación de WordPress: restaurar los dos archivos originales desde ese respaldo privado y desactivar el archivo MU específico; no sobrescribir otros plugins ni la base de datos. Reponer el DNS www anterior únicamente si deliberadamente se desea volver a servir la web vieja a los resolutores antiguos. No cambiar el MX ni el A raíz como parte de esa reversión.
