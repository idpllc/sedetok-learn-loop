# Recarga de créditos desde los sitios web de cada colegio

## Situación actual

El pago siempre vuelve a un único dominio fijo (`sedefy.com`): las URLs de retorno del checkout están escritas a mano en la función de pago. Si el cliente llegó desde el sitio de su colegio, termina fuera de su sitio y no ve reflejada la recarga.

Lo bueno: la acreditación de los créditos ya ocurre en el servidor (aviso automático de Mercado Pago), no depende de a dónde regrese el usuario. Lo único que falta es el regreso correcto y que el sitio del colegio muestre el saldo actualizado.

## Qué haremos

1. **Lista de dominios autorizados por institución**
   Una tabla nueva donde cada colegio registra sus dominios (ej. `pagos.colegio1.edu.co`). Solo esos dominios pueden usarse como retorno; así nadie puede desviar un pago a un sitio ajeno.

2. **El sitio de origen viaja con el pago**
   Al iniciar el pago se envía el dominio desde el que vino el usuario. Se valida contra la lista, se guarda junto a la suscripción y se usa para construir las URLs de éxito / error / pendiente. Si no coincide con ninguno, se usa sedefy.com como hoy.

3. **Página de retorno unificada**
   Al volver, el usuario aterriza en su propio sitio con el resultado del pago. Esa página consulta el estado real de la suscripción y muestra el saldo ya recargado; si el aviso de Mercado Pago aún no llegó, reintenta unos segundos (ya existe una función de sincronización que lo resuelve).

4. **Sesión compartida entre sitios**
   Para que el colegio vea "sus" créditos, el usuario debe estar identificado en ese sitio. Se reutiliza el acceso automático ya existente: el sitio del colegio abre el pago con un enlace firmado que identifica al usuario, y al volver se mantiene la misma cuenta.

5. **Panel de administración**
   En el panel de institución se podrán agregar y quitar los dominios autorizados de cada colegio, sin tocar código cada vez que entre uno nuevo.

## Detalles técnicos

- Nueva tabla `institution_domains` (institution_id, domain único, is_active) con RLS: lectura pública de dominios activos, escritura solo admins; GRANTs explícitos.
- `mp-create-checkout` y `payment-link-create-yearly`: aceptan `return_origin`; validan contra `institution_domains` (y contra `CUSTOM_DOMAIN`); guardan `return_origin` en `user_subscriptions`; construyen `back_urls` con ese origen. Fallback al dominio actual.
- `mp-checkout-webhook` no cambia: sigue siendo la fuente de verdad de la acreditación.
- Ruta `/pricing?subscription=...` (o `/pago/resultado`) hace polling con `mp-sync-checkout` hasta 3 intentos antes de mostrar el resultado final.
- CORS de las funciones de pago: reflejar el `Origin` cuando esté en la lista autorizada.
- Identificación cruzada vía la función `auto-login` existente (token firmado), sin duplicar cuentas.

## Preguntas abiertas

- ¿Los sitios de los colegios son sitios propios (WordPress, etc.) que solo enlazan a Sedefy, o esperan mostrar el saldo dentro de su propia página?
