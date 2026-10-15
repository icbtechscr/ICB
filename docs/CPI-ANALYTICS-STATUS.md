# Estado de las ventas sincronizadas de CPI

La analítica de vendedores, sucursales y portal consulta `cpi_sales`, no CPI en tiempo real. Si el sincronizador falla, un periodo vacío en esa copia no demuestra ausencia de ventas.

`getCpiSalesStatus` consulta por separado el máximo `synced_at` registrado y la fecha de la última factura disponible. No intenta autenticarse en CPI ni guarda o reasigna ventas. La falta de datos, errores de Supabase y fechas inválidas son estados explícitos; nunca se presentan como actualización reciente. Más de tres horas sin actualización registrada muestra una advertencia, no una prueba de que el servicio esté caído (por ejemplo, puede no haber facturas nuevas en un periodo largo).

El aviso aparece en analítica, ventas de sucursales, desempeño de vendedores e inicio/ventas/rendimiento comercial del portal. Muestra las fechas en Costa Rica y explica que los totales/rankings corresponden a la copia disponible y que deben contrastarse con CPI antes de tomar decisiones. No cambia reglas de venta, monedas, comisiones o exclusiones de vendedores.

## Recuperación

1. Comprobar fechas y registros de `icb-cpi.service` y `icb-cpi-full.service`, sin imprimir secretos.
2. Verificar inicio de sesión con la cuenta/empresa ICB configuradas. Un HTTP200 con redirección JavaScript a `Enter.php?ERROR=S` es un rechazo de autenticación, no un login exitoso. Contrastar la configuración con el acceso manual; no restablecer contraseñas ni probar variantes.
3. Si requiere una credencial actual, recibirla por un canal seguro y actualizar solo los consumidores ICB autorizados. No reutilizar una cuenta de otra tienda sin confirmación explícita de que tiene acceso a ICB; nunca mostrar secretos en chat/logs/Git.
4. Antes de recuperar la copia faltante, respaldar sus datos y confirmar la empresa de origen. Consultar primero en dry-run y usar rangos acotados, preservando las facturas reales de CPI y enlaces explícitos a vendedores. No declarar recuperación hasta comprobar datos y sincronización programada.

### Recuperación solo de facturas faltantes

`scripts/recover-cpi-sales.mjs` permite restaurar un rango de hasta 62 días de ICB (empresa 20 y Supabase propio autorizado). Reutiliza el login y parser del sincronizador, pero no su ruta de guardado habitual. Por defecto hace solo consultas:

```sh
node scripts/recover-cpi-sales.mjs --from=YYYY-MM-DD --to=YYYY-MM-DD
```

Después de revisar el respaldo, empresa, rango, cantidades y enlaces, agregar `--apply --expected-missing=N` con la cantidad pendiente recién comprobada. Si cambia esa cantidad, se cancela sin escribir. Usa una única inserción atómica para las claves faltantes; una colisión concurrente falla sin sobrescribir. Conserva las asociaciones explícitas existentes, no empareja nombres ni crea mapeos. No actualiza facturas existentes ni elimina ninguna. Los vendedores sin usuario siguen sin vincular hasta su identificación autorizada. Ejecutar bajo el mismo lock `/run/lock/icb-cpi.lock` que el worker para evitar carreras.

La recuperación de facturas no completa por sí sola las tablas de productos, cotizaciones o inventario: verificar por separado su última fecha y los trabajos programados. El aviso de frescura se refiere únicamente a `cpi_sales`.

Pruebas aisladas: `node --test tests/cpi-sales-status.test.mjs tests/cpi-sales-recovery.test.mjs`, además de TypeScript/build cuando corresponda. Ninguna de estas pruebas conecta a CPI ni crea ventas reales.
