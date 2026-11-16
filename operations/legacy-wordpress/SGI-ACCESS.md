# Acceso a SGI desde redes con DNS antiguo · 16/nov/2026

## Causa y corrección

El usuario precisó que Herbert y otros no podían cargar la página: el navegador decía que no se podía acceder al sitio, antes de pedir o validar credenciales.

Los DNS actuales (1.1.1.1 y 8.8.8.8) resolvían `sgi.icbtechscr.com`. Los dos DNS antiguos de Neothek (`51.222.105.179` y `51.161.108.91`) respondían NXDOMAIN para ese nombre y para `api.icbtechscr.com`. La aplicación de SGI usa este último como servicio de autenticación. La copia de la zona antigua había corregido raíz/www pero no incluía esos dos servicios; por eso usuarios de distintas redes obtenían resultados diferentes.

Se agregaron exclusivamente en la zona antigua los ocho registros A/AAAA de `sgi-access-dns.json`, con TTL 300 y Duplicate to pointers desactivado. Coinciden con las direcciones que entrega actualmente Cloudflare para ambos nombres. No se cambiaron túneles, la aplicación, contraseñas, cuentas, permisos, cookies ni datos de las empresas. No se replicó configuración de ICB en TuStore.

## Verificación

- Cuatro servidores DNS (Cloudflare público, Google y los dos antiguos) resuelven SGI/API por IPv4 e IPv6.
- HTTPS estricto, acceso público y cada una de las dos IP IPv4 de Cloudflare: `/ingresar` responde 200 con el formulario correcto.
- El POST JSON sin credenciales a `/api/sesion/iniciar` responde 400 con su validación; no se intentó autenticar a un usuario real.
- `/api/sesion/verificar` sin cookies responde 401, manteniendo la protección.
- Desde el contenedor SGI de ICB, el health de Auth responde 200 usando su configuración existente, sin exponer claves.
- El navegador abrió la pantalla de ingreso. Captura local: `evidence/icb-sgi-dns-access-20261116/sgi-login.jpg`.

El transporte IPv6 no se probó desde el equipo local; se comprobó su resolución en los cuatro DNS. La conexión HTTPS se probó por IPv4 y por el acceso público normal. No se afirma haber completado el inicio de sesión de Herbert: falta su comprobación desde el equipo afectado.

## Caché negativa

El SOA antiguo establece 1800 segundos para las respuestas negativas. Un proveedor que hubiese guardado el NXDOMAIN puede seguir mostrando el fallo hasta que expire esa entrada. Corregir el servidor autoritativo no borra la caché del proveedor. Reintentar desde datos móviles permite comparar otra resolución sin cambiar la dirección del SGI ni la contraseña. No se ofrece otro dominio como sustituto.

## Observación de capacidad

En la lectura de infraestructura, el disco principal tenía aproximadamente 2 GB libres (df redondeó su uso a 100%). Docker no tenía caché de compilación para limpiar. No se eliminaron imágenes de reversión, bases, volúmenes ni respaldos para esta corrección; la capacidad del disco requiere tratamiento separado. El fallo reportado de página inaccesible sí se reprodujo mediante NXDOMAIN en los DNS antiguos.

## Reversión

Si se retira la zona antigua al finalizar la transición de delegación, estos registros dejan de ser necesarios. Para revertir sólo este lote, quitar únicamente los ocho registros incorporados, sin tocar sus equivalentes activos en Cloudflare ni los registros de correo. La reversión volvería a impedir el acceso para resolutores que aún consulten la zona antigua.
