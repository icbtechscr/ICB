# Cronograma de desarrollo ICB

Ruta: `/admin/cronograma`, accesible desde el menú Admin. Reutiliza la sesión de ICB y sus roles existentes.

- Admin y dev: consultar tareas, avances e imágenes; crear tareas con nombre, descripción, inicio y dificultad sugerida. Todas nacen en Sin asignar. El servidor identifica al creador.
- Dev: mover y ordenar tareas, cambiar descripción y dificultad definitiva, añadir avances e imágenes. Puede operar arrastrando o con el selector Mover a y los botones Subir/Bajar del detalle (también en móvil/teclado).
- Colaborador y visitantes: sin acceso al módulo ni a sus APIs o imágenes.

## Instalación

Aplicar `supabase/schedule.sql` **en la base de ICB** antes de publicar el código. Crea solamente tablas `icb_schedule_*`, dos funciones restringidas al servicio y el bucket privado `icb-schedule`. No modifica las tablas operativas existentes. Requiere los roles estándar de Supabase y su esquema Storage. Después de aplicarlo, recargar la caché de esquema de PostgREST si la instancia no lo hace automáticamente (`NOTIFY pgrst, 'reload schema';`). El código informa que falta la migración si las tablas/funciones no están instaladas; no simula guardados.

No requiere variables nuevas; usa las credenciales de Supabase ya configuradas en el servidor. No exponer la clave administrativa al cliente. Las nuevas tablas tienen RLS sin políticas públicas. Las funciones y los datos solo se consumen desde los handlers autenticados. El bucket no tiene políticas de lectura o escritura para el navegador; las imágenes se entregan a través de la API administrativa con caché privada desactivada.

## Funcionamiento

Un solo tablero de desarrollo compartido entre los administradores de ICB. La capacidad de Trabajando ahora es de **tres tareas en total**, incluso desde sesiones concurrentes. No son tres espacios por administrador. Los desarrolladores existentes comparten el tablero; no se crean cuentas ni cambian roles.

Sin asignar, Urgente, Importante, No importante y Terminadas conservan el orden indicado. Todas las mutaciones se serializan con un bloqueo de la fila del tablero. Los movimientos y ediciones requieren revisión vigente; las ediciones además comprueban la fecha de la versión original para preservar borradores frente a cambios remotos. Un conflicto conserva el borrador y permite recargar detalles explícitamente.

El navegador consulta el tablero cada cinco segundos mientras está visible y al volver a la pestaña o recuperar conexión. Los relojes avanzan cada segundo usando la hora de servidor. No depende de habilitar Supabase Realtime.

Los clientes administrativos del cronograma desactivan explícitamente el refresco de Auth para no retener temporizadores en cada consulta del tablero. La opción nueva del factory es optativa y no cambia los clientes de otros módulos.

El **tiempo desde el inicio** usa la fecha/hora indicada, incluye espera y se congela al terminar. El **tiempo trabajado en vivo** suma únicamente períodos en Trabajando ahora: salir pausa, volver reanuda, finalizar detiene. La hora indicada al crear no añade tiempo en vivo retroactivo. Inicio y bitácora se muestran en Costa Rica, independientemente de la zona del dispositivo. Se puede reabrir una terminada moviéndola a otra columna.

Los avances registran hora de servidor y autor, con hasta cuatro imágenes PNG/JPEG/WebP/GIF de 5 MB cada una. Se validan tipo y firma del archivo. Los avances se consultan de 50 en 50 y se pueden cargar los anteriores. Una pérdida de respuesta después de confirmar una escritura puede requerir revisar el tablero antes de reintentar para evitar duplicados. No se borran imágenes ante una respuesta RPC ambigua, para conservar adjuntos que pudieron guardarse; operaciones puede revisar huérfanos ante fallos de red.

## Verificación

`node --test tests/schedule.test.mjs` verifica permisos y origen detrás de proxy, validación, identidad, conflictos, relojes, formatos de imagen, clientes sin refresco de Auth, acceso privado a adjuntos y guardas de las seis operaciones API. `node node_modules/typescript/bin/tsc --noEmit --incremental false` verifica tipos. La integración PostgreSQL se comprueba con `tests/schedule-postgres.test.mjs`, únicamente si se proporciona `ICB_SCHEDULE_TEST_DATABASE_URL` a una base aislada vacía llamada `icb_schedule_test` (o con sufijo numérico, por ejemplo `icb_schedule_test_2`) y `ICB_SCHEDULE_PSQL` al ejecutable psql. Esa prueba prepara roles/esquema Storage mínimos e instala la migración dos veces; no apuntarla a producción. Se comprobó con PostgreSQL 17 local: capacidad, escrituras concurrentes, orden, pausa/reanudación, finalización, protección de borradores, bitácora y permisos.

La compilación utiliza variables ficticias y no valida conexión a producción. La revisión interactiva de escritorio/móvil requiere habilitar el navegador local en Work; no se da por comprobada mientras esté deshabilitado.
