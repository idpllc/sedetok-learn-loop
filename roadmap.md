# Roadmap

## /pagar — checkout para acudientes (MercadoPago) — COMPLETADO
- [x] Migración: tablas `school_endpoints`, `checkout_orders`, `payment_relays` (solo service_role)
- [x] Edge function `pagar-api`: session, quote, order, checkout, status (valida colegio en school_endpoints)
- [x] Extender `mp-checkout-webhook`: flujo checkout_orders + aviso firmado al colegio (payment_relays)
- [x] Página `/pagar` (elegir hijos + resumen + pagar) y `/pagar/resultado`
- [x] Privacidad: noindex, Referrer-Policy no-referrer, excluir Clarity/gtag y popups en /pagar, robots.txt
- [x] Desplegar funciones, verificar build y flujo en preview (con respuestas simuladas del colegio)
- [x] Webhook: misma URL ya configurada para /pricing (evento Pagos); ahora también atiende checkout_orders

## Pendiente (bloqueado por terceros)
- [ ] Prueba end-to-end real: requiere un colegio de pruebas con la API /api/planes/pago-externo y /api/sedefy-pago, y registrar su origin + webhook_secret en school_endpoints

## Planes comprados + alertas de compra por correo — COMPLETADO
- [x] Migración: admins/superadmins pueden leer todas las suscripciones, pagos y pedidos /pagar
- [x] Panel Pagos: tabla "Planes comprados" (Sedefy + colegios, totales, buscador, estados)
- [x] Correo a admins + jeff@idpagency.co al intentar comprar (mp-create-checkout y pagar-api)
- [x] Correo al pagar efectivamente (mp-checkout-webhook, ambos flujos, sin duplicados)
- [x] Webhook ya no inserta pagos duplicados (mismo provider_transaction_id)
- [ ] Pendiente: probar el correo con una compra real (requiere pago en MercadoPago)
