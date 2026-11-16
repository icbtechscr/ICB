# ICB: restauración del dominio principal

Estado vigente aplicado el 16 de noviembre de 2026: la tienda se abre en **https://icbtechscr.com/**, también desde www. No se requiere usar un subdominio alternativo. La página separada de WordPress y su aviso fueron retirados por instrucción del usuario.

## Configuración vigente

### DNS

Cloudflare continúa siendo la autoridad del dominio. Sus rutas originales del dominio raíz, www y SGI no se cambiaron.

Los dos servidores DNS antiguos de Neothek también entregan ahora para `icbtechscr.com` las IP verificadas de Cloudflare `104.21.49.91` y `172.67.189.113`, con TTL 300; www ya usa esas mismas IP. Antes, sólo www se había corregido y el A raíz aún conducía a WordPress.

Para cambiar el A raíz sin conservar la dependencia del correo respecto de la IP web:

- En la zona antigua, el MX `0 icbtechscr.com.` se reemplazó por los tres MX que ya usa el dominio en Cloudflare: 10 `route2.mx.cloudflare.net.`, 39 `route1.mx.cloudflare.net.` y 84 `route3.mx.cloudflare.net.`, TTL 300.
- El CNAME antiguo `mail` se fijó a `bison.smart-hosts.com.` (mismo alojamiento antiguo) para que ese acceso no siga el A raíz hacia un servidor web de Cloudflare.
- El SPF antiguo conserva sus IP explícitas y agrega el include de correo vigente: `v=spf1 ip4:51.222.105.179 ip6:2607:5300:203:86b3:0:0:0:0 include:_spf.mx.cloudflare.net ~all`. Se quitaron a/mx como autorizaciones implícitas porque esos nombres ya apuntan a servicios diferentes.

No se borraron buzones, mensajes, archivos, bases de datos ni registros comerciales. No se enviaron correos de prueba en esta restauración. Los emisores que tengan un MX/A anterior en caché pueden reintentar durante la transición; no se puede afirmar la entrega de un mensaje concreto sólo con estas pruebas DNS.

### Clientes que aún llegan a la IP antigua

En el alojamiento de Neothek, `/domains/icbtechscr.com/public_html/.htaccess` conserva su contenido original, precedido únicamente por `legacy-root-redirect.conf`.

Los accesos HTTPS con Host `icbtechscr.com` o `www.icbtechscr.com` usan `_icb_current_site_bridge.php`, cuyo código versionado es `current-site-bridge.php`. El puente consulta el sitio actual por HTTPS con Host/SNI original y las IP públicas verificadas de Cloudflare; el navegador conserva su dominio. La verificación del certificado y del nombre sigue habilitada. No se usa un proxy HTTP sin cifrar y no se sigue ninguna redirección del servidor internamente.

El destino está limitado a los dos nombres públicos originales. No admite un destino enviado por el cliente, bloquea recursión y no ejecuta comandos ni escribe datos comerciales. Preserva el método, cuerpo JSON, formularios, archivos multipart, estado, cookies separadas y encabezados de seguridad del sitio actual; omite encabezados propios del transporte. Los cuerpos binarios se transmiten sin transformación. No reintenta operaciones de escritura automáticamente. Los límites de carga del hosting antiguo siguen aplicando; rechaza con 413 un multipart que PHP haya descartado por tamaño.

El HTTP antiguo se conduce al HTTPS del dominio principal. Los clientes cuyo DNS ya está actualizado llegan directamente al túnel y a la aplicación, sin pasar por el puente. El puente se puede retirar cuando los registros de acceso confirmen que dejaron de llegar clientes al alojamiento antiguo. No necesita reconstruir la aplicación Next ni cambiar SGI.

### Retiro del sitio alternativo

`anterior` ya no presenta WordPress: responde sólo con una redirección al dominio principal. `tienda` también devuelve al principal; el router de compatibilidad en `/data/coolify/proxy/dynamic/icb-store-transition.yaml` usa ahora un middleware de redirección, no una tienda independiente.

Estos nombres conservan únicamente la respuesta de compatibilidad necesaria para recuperar navegadores que ya habían guardado un 301 del dominio principal hacia anterior. Borrarlos inmediatamente haría fallar esos navegadores antes de que pudieran regresar. La redirección usa el parámetro `icb_actual=20261116` para evitar reutilizar la URL exacta del antiguo 301; termina en el dominio original incluso forzando también su IP antigua. No se les pide a los usuarios visitar esos subdominios.

Se restauró el `wp-config.php` original desde el respaldo privado, retirando WP_HOME/WP_SITEURL de anterior. `icb-legacy-url.php` quedó desactivado: no reescribe URL ni agrega un aviso. WordPress conserva sus archivos y base de datos; no se publica como web separada.

## Verificación

`verification-canonical-restore.json` registra fecha UTC y validación TLS normal:

- HTTP/HTTPS y raíz/www forzados a la IP antigua: la aplicación actual responde 200 y conserva el dominio original; HTTPS raíz no redirige.
- Los enlaces de los nombres retirados finalizan en icbtechscr.com, también simulando un A raíz antiguo.
- Catálogo y carrito responden igual por el acceso directo y por el puente.
- Una solicitud JSON vacía al inicio de sesión conserva el 400 y su mensaje de validación; no se intenta autenticar a una persona.
- Consulta administrativa y multipart sin sesión conservan el 401; no se cargó un archivo en los datos de la aplicación.
- El favicon descargado por ambos caminos tiene el mismo SHA-256.
- Los tres servidores consultados (Cloudflare público y ambos antiguos) muestran las IP correctas del dominio; los MX antiguos coinciden con los vigentes.
- El navegador abrió https://icbtechscr.com/ y comprobó que el enlace de anterior regresa a ese dominio. Captura local en `evidence/icb-canonical-restore-20261116/icbtechscr-com.jpg`.

Una prueba negativa que forzó tienda a la IP Neothek falló correctamente por certificado: ese nombre nunca apuntó allí ni tiene vhost allí. No es una ruta usada por visitantes. La ruta real de tienda por Cloudflare sí termina en el principal. No se deshabilitó TLS para esa prueba.

No se crearon pedidos, cobros, facturas ni movimientos de inventario. No se efectuó una compra real ni se probó la firma o emisión fiscal. El puente se validó con navegación, binarios, validación JSON y rechazo de acceso no autorizado.

## Evidencia y reversión

Las exportaciones DNS previas y las pruebas por etapa permanecen en el workspace operativo, bajo `evidence/icb-legacy-link-20261116`, `evidence/icb-legacy-redirect-fix-20261116` y `evidence/icb-canonical-restore-20261116`. Las pruebas anteriores describen estados anteriores y quedan sustituidas por este informe.

Los originales completos de wp-config.php y .htaccess están en un respaldo privado local fuera de Git. No se incluyen credenciales en este repositorio. Para retirar sólo el puente, esperar a que se agote el tráfico antiguo y quitar su regla de reescritura y su archivo, conservando las redirecciones de compatibilidad. No devolver el A raíz a WordPress como parte de esa limpieza. Si se revierte el DNS, hay que revisar conjuntamente A, MX, mail y SPF; no reponer un MX que vuelva a depender de la IP web.


## Acceso SGI en redes afectadas

Se completaron también las rutas SGI/API que faltaban en la zona antigua. Ver [SGI-ACCESS.md](SGI-ACCESS.md), los ocho registros en `sgi-access-dns.json` y la comprobación en `verification-sgi-access.json`.
