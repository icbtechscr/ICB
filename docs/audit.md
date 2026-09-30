# Auditoría ICB

Instalar `supabase/audit.sql` con el propietario de PostgreSQL antes de desplegar la aplicación. La migración es transaccional y se puede repetir; no borra historial. Repetirla al agregar tablas de negocio para instalar sus triggers.

La sección `/admin/auditoria` es exclusiva del administrador/dev y consulta 50 entradas por página, con filtros por tabla, acción, identificador, número de pedido, usuario y fecha (Costa Rica).

Se registran las inserciones, modificaciones y eliminaciones de todas las tablas públicas existentes y de `auth.users`, incluyendo trabajos CPI y SQL directo. Los cambios de filas y su auditoría comparten transacción: si falla la auditoría, no se confirma el cambio. Los vaciados TRUNCATE guardan las filas anteriores. Pedidos, sus artículos y productos existentes tienen una instantánea inicial; no representa un historial previo.

La aplicación registra peticiones dinámicas recibidas (no imágenes ni prefetch), accesos de sesión, resultados de operaciones del cliente de servicio, arranques/despliegues y errores no manejados capturados por Next. Estas entradas informativas son best effort; un fallo de escritura queda en el log del servidor como AUDIT_WRITE_FAILED. Una petición recibida no demuestra que se completó una compra. Los cambios de archivos locales no desplegados, errores manejados que no producen una operación y cambios de infraestructura externos no se registran automáticamente.

El contexto de identidad se obtiene de una sesión verificada; se descartan cabeceras de identidad enviadas por el navegador. Los cambios por conexión SQL sin contexto se identifican como base de datos/sistema. No se registran cuerpos HTTP, cookies, cabeceras de autorización ni parámetros URL. La base redacta campos de contraseña, secretos, tokens y tarjetas recursivamente.

La tabla no concede UPDATE, DELETE ni TRUNCATE a anon, authenticated o service_role. Triggers también bloquean estas operaciones. No hay purga ni controles de borrado en el panel. El propietario de PostgreSQL o del servidor puede desactivar estas protecciones; no equivale a almacenamiento WORM externo. El almacenamiento es finito y requiere monitoreo de espacio y copias de seguridad externas con retención inmutable para protección frente al propietario o pérdida del servidor.

Prueba no destructiva: ejecutar `supabase/audit-test.sql`; todas las pruebas se revierten con ROLLBACK, incluyendo cambios de producto y eventos de prueba.
