/**
 * OFFMAP — aiPersonalization.js (v3)
 * 
 * Genera el itinerario narrativo, teniendo en cuenta:
 * - Los precios REALES ya buscados por tripBuilder
 * - El presupuesto restante para actividades diarias
 * - El perfil del viajero y preferencias
 */

const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function genPersonalization({ destination, origin, days, travelers, preferences, budget, priceData, lang = 'es' }) {
  const langLabel = { es: 'Spanish', en: 'English', fr: 'French' }[lang] || 'English';
  const ba = priceData?.budget_analysis || {};
  const dailyBudget = ba.daily_spend_estimated || Math.round(budget * 0.2);
  const budgetRemaining = ba.budget_remaining || budget;
  const fits = ba.fits_budget !== false;
  const tier = ba.budget_tier || 'mid';

  const tierNote = {
    low: 'The budget is very comfortable — suggest premium experiences without hesitation.',
    mid: 'Budget is comfortable for quality mid-range experiences.',
    tight: 'Budget is tight — prioritize free or low-cost experiences, mention prices.',
    over: 'Budget is over — flag this clearly and suggest cheaper alternatives.',
  }[tier] || '';

  const flightNote = priceData?.flight?.found
    ? `Flight booked: ${priceData.flight.airline}, €${priceData.flight.price_per_pax}/person, departing ${priceData.flight.departure_time}`
    : 'Flight not confirmed yet.';

  const hotelNote = priceData?.hotel?.found
    ? `Hotel: ${priceData.hotel.name} (${priceData.hotel.stars}★, rated ${priceData.hotel.rating}/10), ${priceData.hotel.address}`
    : 'Hotel not confirmed yet.';

  const prefs = preferences?.length ? preferences.join(', ') : 'no specific preferences';

  const prompt = `You are the travel editor of an independent European magazine — not mass tourism, but the kind sold in design bookshops and select airport lounges. You write for people aged 28 to 45 who have travelled before, who can tell a neighbourhood bar from a tourist trap.

Your voice: direct, opinionated, occasionally ironic, always specific. Never preachy. Never enthusiastic without reason. Every recommendation has a specific reason. Descriptions evoke something real. Include experiences not in the top search results.

Avoid absolutely: "unmissable", "hidden gem", "authentic", "charming", "must-see", "magical".
Use: proper names, specific times, exactly what to order, why this place and not the one next door.

Trip context:
- Destination: ${destination}
- Origin: ${origin}
- Duration: ${days} days
- Travelers: ${travelers}
- Daily budget for activities: ~€${dailyBudget}/person/day
- Preferences: ${prefs}
- Budget situation: ${tierNote}
- ${flightNote}
- ${hotelNote}

Generate a complete ${days}-day itinerary in ${langLabel}.

Return ONLY valid JSON (no markdown):
{
  "title": "Trip title (short, specific, not generic)",
  "introduction": "2-3 sentence personalized intro. Direct, specific to this destination and budget level. Mention what makes this trip work.",
  "itinerary": [
    {
      "day": 1,
      "title": "Day title",
      "theme": "One-line theme",
      "morning": "Specific activity with name, address, what to do exactly",
      "afternoon": "Specific activity",
      "evening": "Specific place + what to order/do",
      "gem": "One insider detail most guides miss",
      "estimated_daily_cost": ${dailyBudget}
    }
  ],
  "tips": [
    "Practical tip 1 — specific and actionable",
    "Practical tip 2",
    "Practical tip 3"
  ]
}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const txt = (msg.content[0]?.text || '').replace(/```json|```/g, '').trim();
    return JSON.parse(txt);
  } catch (e) {
    console.error('[aiPersonalization] error:', e.message);
    return {
      title: `${days} días en ${destination}`,
      introduction: `Un viaje a ${destination} diseñado para ${travelers} viajero${travelers > 1 ? 's' : ''}.`,
      itinerary: Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        title: `Día ${i + 1}`,
        theme: 'Exploración',
        morning: 'Visita el centro histórico',
        afternoon: 'Mercado local',
        evening: 'Cena en barrio residencial',
        gem: 'Pregunta en el hotel por el bar favorito de los locales.',
        estimated_daily_cost: dailyBudget,
      })),
      tips: ['Lleva efectivo para mercados', 'Evita restaurantes con foto en la carta', 'Los museos nacionales suelen ser gratuitos un día a la semana'],
    };
  }
}

module.exports = { genPersonalization };
