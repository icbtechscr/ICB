# Operación de ICB en el servidor propio

Estado y evidencia de la preparación: [28/08/2026](ESTADO-2026-08-28.md).

## Entornos y límites

- Servidor: `192.168.0.104`, Ubuntu, Coolify. No publicar su panel, SSH,
  PostgreSQL, MinIO ni Supabase Studio en Internet.
- Web de pruebas: `http://icb-pruebas.192.168.0.104.sslip.io`.
- API de pruebas: `http://supabase-icb-pruebas.192.168.0.104.sslip.io`.
- Producción continúa en Vercel/Supabase Cloud hasta validar el cambio.
- `ICB_EXTERNAL_EFFECTS_ENABLED=false` bloquea pagos, correos y notificaciones
  salientes en la copia local. No iniciar un segundo worker de WhatsApp.
- Los secretos solo están disponibles durante ejecución. Únicamente las
  variables `NEXT_PUBLIC_*` son argumentos de compilación.
- Las claves recuperadas de archivos `.env` anteriores requieren validación
  con los proveedores; recuperar un valor no demuestra que siga vigente.

## CPI en Linux

Se construye una imagen separada con el mismo código versionado:

```sh
docker build --target cpi-worker -t icb-cpi:local .
```

Copiar los scripts de operación a `/opt/icb-ops`, las unidades a
`/etc/systemd/system`, y la configuración privada a `/etc/icb/runtime.env`
(directorio 700, archivo 600). `runtime-env.py` convierte un JSON privado al
formato literal de Docker sin imprimir valores.

`host-job.sh cpi` sincroniza los últimos tres días y el inventario actual;
`cpi-full` reconcilia 31 días. Ambos comparten un bloqueo para no solaparse.
El worker rechaza Supabase Cloud y exige `ICB_SYNC_TARGET_ORIGIN` igual al
destino autorizado. No modifica documentos en CPI: lee reportes y actualiza
la copia local. Los scripts originales de cotizaciones/inventario reemplazan
datos por etapas, no en una transacción; conservar respaldos y revisar fallos.

- `icb-cpi.timer`: cada 30 minutos.
- `icb-cpi-full.timer`: 01:10, Costa Rica.
- `icb-reminder.timer`: 08:35, Costa Rica; dejar DESACTIVADO hasta el corte.
- `host-job.sh reminder-test`: consulta y cuenta, sin enviar avisos.
- `journalctl -u icb-cpi.service`: resultado de cada sincronización.

La tarea de Windows `ICB Sync CPI` debe seguir alimentando la producción
anterior durante las pruebas. Desactivarla solo en el corte, no antes.

## Respaldos

`backup.py` guarda las dos bases de Supabase, roles, Auth (incluyendo hashes
de contraseña), Storage, configuración y base de Coolify. Comprueba que los
datos permanezcan estables durante la copia; si cambian, reintenta y no
publica un respaldo inconsistente. No copia un PGDATA en uso.

```sh
python3 /opt/icb-ops/backup.py
python3 /opt/icb-ops/restore-check.py /var/backups/icb/icb-FECHA.tar.gz
```

La prueba crea un PostgreSQL desechable, sin red ni puertos, restaura ambas
bases y compara contenido/conteos, usuarios, políticas y archivos. Nunca
restaura sobre la base en uso. El archivo `*.restore-check.json` registra el
resultado. El volcado de Coolify se incluye, pero esta prueba no restaura su
panel ni certifica una recuperación completa de la máquina.

Las huellas del contenido usan UTC, precisión de flotantes y orden binario
explícitos: así no cambian por las diferencias de ordenación entre ICU/libc.
La comprobación aislada verifica datos; una recuperación real también debe
preservar la configuración regional de las bases (producción usa ICU en-US).

`icb-backup.timer`: 02:40 Costa Rica, conserva 14 respaldos completos.
Archivos en `/var/backups/icb`, permisos privados y SHA-256. Contienen datos
personales y secretos: NO subirlos a Git ni compartirlos como enlaces públicos.
Los archivos no están cifrados en disco; la copia por SSH va cifrada.

Un respaldo en el mismo SSD NO protege de la pérdida del servidor. Mantener
otra copia en un equipo/disco separado. La copia externa inicial es manual;
falta escoger un destino permanente para automatizarla.

## Antes del cambio de dominio

1. Recibir de Neotek el token del túnel; instalarlo como secreto (no en Git).
2. Publicar web y API por HTTPS. En la API solo permitir las rutas necesarias
   de Auth, REST, Storage y Realtime; no exponer Studio, paneles ni bases.
3. Establecer los dominios públicos en Coolify, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_ORIGIN` y callbacks de Auth.
   Recompilar: cambiar solo el entorno de un contenedor no cambia el cliente.
4. Completar Resend (clave y remitente/destinatario) y el SMTP de Supabase para
   recuperación de contraseñas/invitaciones. Comprobar pagos/notificaciones
   con pruebas autorizadas; no hacer cobros reales para comprobar el despliegue.
5. Probar inicio de sesión de admin/colaborador, imágenes, reportes, subida de
   archivos, correo y cookies con HTTPS. Los usuarios deberán iniciar sesión
   de nuevo porque los tokens de Supabase Cloud no son válidos localmente.
6. Acordar una breve pausa de escrituras y hacer la sincronización final de
   DB, usuarios y Storage. El respaldo anterior no contiene ventas/pedidos
   posteriores. Respetar las relaciones de cotizaciones y líneas.
7. Cambiar DNS del sitio y API SIN modificar MX/SPF/DKIM/DMARC; comprobar desde
   una conexión externa. Desactivar Windows/Vercel Cron antes de habilitar
   recordatorios locales y efectos externos.
8. Guardar y probar un respaldo final fuera del servidor. Solo después de
   validar el corte, retirar los proyectos antiguos y suscripciones pagadas.

Pendientes externos: token de Cloudflare; clave de correo vigente; definición
de copia externa automática. Tener UPS no elimina estos requisitos.

El conector `cloudflared` 2026.8.2 está preparado con imagen fijada por digest.
`icb-tunnel.service` permanece deshabilitado. El token se debe guardar como
`/etc/icb/cloudflare.token`, propietario 65532:65532 y modo 400; el directorio
permanece privado. El token nunca va en la línea de comandos ni en Git.
El túnel usa HTTP/2 sobre TCP 7844 (conectividad saliente verificada). No
habilitarlo hasta validar los destinos configurados en Cloudflare.

La auditoría de dependencias del 28/08/2026 detectó cinco paquetes con avisos
altos (Next.js y dependencias incluidas). Esta migración no cambia de versión
el framework: planificar la actualización y pruebas antes del corte público.

Referencias: [Supabase: migración a servidor propio](https://supabase.com/docs/guides/self-hosting/restore-from-platform),
[Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/).
