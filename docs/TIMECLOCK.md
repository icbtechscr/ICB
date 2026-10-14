# Marcaje y control de horario

Los permisos administrativos y la obligación de marcar son independientes. Colaboradores y devs continúan en el roster. Un administrador se incluye si su perfil tiene `clock_in_required: true`, sin cambiar su rol ni conceder edición de marcaciones (sigue siendo exclusiva de dev). El resto de administradores no se activa automáticamente. La asignación de sedes usa `branch_ids`; una lista vacía no se interpreta como una asignación legacy.

Horario e historial comparten la lista de usuarios paginada, con error explícito ante una consulta incompleta. El historial también conserva en el selector a quienes tienen marcas en el resultado aunque su perfil actual ya no deba marcar. Historial excluye hoy; la pestaña Control de horario muestra el día actual en Costa Rica.

Al filtrar una sede, se muestran sus marcas registradas y las marcas con `branch_id IS NULL` de usuarios actualmente asignados a esa sede. La pantalla explica esta inclusión: no afirma que estuvieran físicamente allí ni altera sus snapshots. Las marcas con otra sede explícita no se reasignan. Las fechas y el filtro de usuario siguen aplicándose simultáneamente.

Portal, tabla admin, celdas editables y exportaciones distinguen:

- Sin GPS: no hay coordenadas válidas.
- GPS registrado · Sin sede: existen coordenadas, pero falta la sede registrada.
- GPS registrado · Sin validar: existe sede/coordenadas, sin una validación de distancia registrada.
- Sede/Casa: validación previa afirmativa.
- A N m: distancia fuera de rango registrada.

Los arreglos de perfil no recalculan horas, distancia o estados históricos. Las marcas nuevas usan las sedes asignadas y la validación GPS existente. No marcar automáticamente para probar ni editar registros reales sin autorización específica.

Verificación: `node --test tests/timeclock-profile.test.mjs`, TypeScript y build de producción. Las pruebas ejercitan roles/flag, paginación/error, GPS versus sede, filtros seguros de PostgREST y render de historial/hoy con un admin que marca, sin escrituras.
