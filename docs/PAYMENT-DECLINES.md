# Diagnóstico de rechazos de tarjeta

Un contexto creado, autenticación3DS exitosa o razón100 en `ics_pa_setup`/`ics_pa_enroll` no demuestran autorización ni captura. La confirmación conserva su comprobación autenticada de referencia exacta, intento, importeCRC completo y servicio de captura exitoso.

La búsqueda puede devolver razón233 para diferentes rechazos del procesador. Solo se clasifica `INVALID_AMOUNT` si la respuesta autenticada trae razón233 y código de procesador13 o el mensaje exacto de `ics_auth` `Invalid amt or Currency conversion field overflow`. El JWT del navegador no clasifica ni aprueba pagos.

La respuesta al cliente y el JSON de diagnóstico administrativo usan textos fijos, nunca `rMessage`, JWT o datos crudos de tarjeta. No se inventa un importe mínimo, aumenta el total, cambia moneda ni desactiva3DS para eludir rechazos. El mismo233 sin evidencia de importe inválido conserva un mensaje genérico del procesador. Razón476 se presenta como fallo de autenticación.

Ante importe inválido, solicitar al adquirente la restricción aplicable y un importe autorizado para una prueba con el titular. Un importe pequeño rechazado no confirma cuál es el mínimo aceptado. La corrección del mensaje no cambia la decisión bancaria ni prueba una captura real.

Los detalles técnicos del caso y las referencias para soporte deben quedar en un entregable privado, no en este repositorio. El diagnóstico externo permite únicamente búsquedas y GET de detalles de transacciones existentes, sin crear contextos ni enviar pagos. La API de detalles usa `Accept: application/hal+json`; esto es independiente de la búsqueda normal usada por la confirmación.

Pruebas aisladas: `node --test scripts/payment-tests.mjs scripts/order-email-tests.mjs`. No conectan a la pasarela ni realizan cobros.

Referencias: [motivos de rechazo](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-checkout/secure-acceptance/sa-reason-codes.html), [detalles de transacciones](https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search/txn-details-intro/txn-details-request.html).
