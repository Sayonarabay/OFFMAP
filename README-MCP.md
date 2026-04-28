# OFFMAP v3 — Integración MCP

## Qué cambió

### Antes (v2)
- Knowledge Base estática (JSON files)
- Precios inventados / estimaciones hardcodeadas
- Claude solo personalizaba texto

### Ahora (v3)
- **Kiwi.com MCP** → vuelos reales con precio real
- **Booking.com MCP** → hoteles reales con precio real
- Claude valida si el trip cabe en tu presupuesto
- Banner de precios reales en el resultado
- Itinerario ajustado al nivel de gasto real

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `api/services/tripBuilder.js` | Reescrito: busca precios via MCP Kiwi + Booking |
| `api/services/aiPersonalization.js` | Reescrito: genera itinerario con contexto de precios reales |
| `api/routes/trip.js` | Reescrito: nuevo flujo MCP + modo legacy compatible |
| `api/config/index.js` | Modelos actualizados, timeout extendido |
| `index.html` | gen() envía checkIn/checkOut/origin/lang; renderResult muestra banner de precios |
| `package.json` | SDK actualizado a ^0.36.0 |

## Variables de entorno necesarias

```env
ANTHROPIC_API_KEY=sk-ant-...
BOOKING_MCP_URL=https://demandapi-mcp.booking.com/v1/mcp/8132308
NODE_ENV=production
```

## Flujo de datos

```
Usuario: París → Lisboa, 7 noches, €800/persona

1. gen() → POST /api/routes/trip {destination, origin, checkIn, checkOut, budget, travelers, lang}

2. trip.js → fetchRealPrices()
   ├── MCP Kiwi: vuelo CDG→LIS, 2 pax, ida/vuelta → €118/pax
   └── MCP Booking: hotel Lisboa, 7 noches, 2 pax → €72/noche

3. budget_analysis:
   ├── vuelo: €236 total
   ├── hotel: €504 total  
   ├── gasto diario: €112/día
   └── total/persona: €426 → fits_budget: true ✓

4. genPersonalization() → itinerario con contexto real
   "Con €374 restantes para actividades y comidas (€53/día), 
    aquí hay margen para..."

5. renderResult() → banner verde con precios + itinerario editorial
```

## Notas importantes

- El MCP Booking.com usa tu token de API de Claude.ai (ya conectado)
- El MCP Kiwi.com igual
- Si el MCP falla, usa estimaciones de fallback (transparente al usuario)
- Los MCPs del servidor backend necesitan estar autenticados en el entorno Vercel
  → Para producción, añadir las URLs MCP como variables de entorno

## Para producción en Vercel

```json
// vercel.json - ya incluido
{
  "rewrites": [{"source": "/api/(.*)", "destination": "/api/$1"}]
}
```

Añadir en Vercel Dashboard → Settings → Environment Variables:
- `ANTHROPIC_API_KEY`
- `BOOKING_MCP_URL`
