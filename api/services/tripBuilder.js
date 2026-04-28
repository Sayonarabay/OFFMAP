/**
 * OFFMAP — tripBuilder.js (v3 con MCPs)
 * 
 * Flujo:
 *  1. Claude con MCP Kiwi.com busca vuelos reales (precio real)
 *  2. Claude con MCP Booking.com busca hoteles reales (precio real)
 *  3. Suma vuelo + hotel + daily spend → valida presupuesto
 *  4. Devuelve objeto enriquecido con datos reales
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MCP_SERVERS = [
  {
    type: 'url',
    url: 'https://mcp.kiwi.com',
    name: 'kiwi',
  },
  {
    type: 'url',
    url: process.env.BOOKING_MCP_URL || 'https://demandapi-mcp.booking.com/v1/mcp/8132308',
    name: 'booking',
  },
];

/**
 * Busca vuelos y hoteles reales, valida presupuesto.
 */
async function fetchRealPrices({ origin, destination, checkIn, checkOut, travelers, budgetPerPax, lang = 'es' }) {
  const days = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
  const totalBudget = budgetPerPax * travelers;
  const langLabel = { es: 'Spanish', en: 'English', fr: 'French' }[lang] || 'English';

  const prompt = `You are a travel price analyst. Search for real flight and hotel prices and return structured data.

Trip details:
- Origin: ${origin}
- Destination: ${destination}  
- Check-in: ${checkIn}
- Check-out: ${checkOut}
- Travelers: ${travelers}
- Budget per person: €${budgetPerPax}
- Total budget: €${totalBudget}
- Duration: ${days} nights

STEPS:
1. Use Kiwi to find round-trip flights from ${origin} to ${destination}, ${travelers} passenger(s), departing ${checkIn}, returning ${checkOut}.
2. Use Booking.com to find hotels in ${destination}, ${travelers} guest(s), check-in ${checkIn}, check-out ${checkOut}.
3. Calculate totals and assess if it fits the budget.

Return ONLY valid JSON (no markdown, no extra text):
{
  "flight": {
    "found": true,
    "airline": "Airline name",
    "price_per_pax": 120,
    "price_total": 240,
    "duration": "2h30",
    "departure_time": "08:15",
    "booking_url": "https://..."
  },
  "hotel": {
    "found": true,
    "name": "Hotel name",
    "stars": 3,
    "price_per_night": 85,
    "price_total": 595,
    "rating": 8.4,
    "address": "...",
    "booking_url": "https://..."
  },
  "budget_analysis": {
    "flight_total": 240,
    "hotel_total": 595,
    "daily_spend_estimated": 60,
    "daily_spend_total": 420,
    "grand_total": 1255,
    "per_person_total": 628,
    "fits_budget": true,
    "budget_remaining": 172,
    "budget_tier": "mid"
  },
  "alternatives": [
    {
      "type": "budget_hotel",
      "name": "Cheaper option name",
      "saving": 30,
      "price_per_night": 55,
      "booking_url": "https://..."
    }
  ]
}

budget_tier values: "low" (<60% used), "mid" (60-90%), "tight" (90-100%), "over" (>100%)
If search fails, set found=false and use realistic estimates.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      mcp_servers: MCP_SERVERS,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlocks = (response.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const clean = textBlocks.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    data._source = 'mcp_live';
    data._ts = new Date().toISOString();
    return data;
  } catch (err) {
    console.error('[tripBuilder] MCP price fetch failed:', err.message);
    return buildFallbackPrices({ destination, days, travelers, budgetPerPax });
  }
}

function buildFallbackPrices({ destination, days, travelers, budgetPerPax }) {
  const flightEstimate = estimateFlight(destination);
  const hotelEstimate = Math.round(budgetPerPax * 0.35);
  const dailySpend = Math.round(budgetPerPax * 0.2);
  const hotelTotal = hotelEstimate * days * travelers;
  const flightTotal = flightEstimate * travelers;
  const dailyTotal = dailySpend * days * travelers;
  const grandTotal = flightTotal + hotelTotal + dailyTotal;
  const perPerson = Math.round(grandTotal / travelers);
  const fits = perPerson <= budgetPerPax;

  return {
    flight: {
      found: false,
      airline: 'Estimated',
      price_per_pax: flightEstimate,
      price_total: flightTotal,
      duration: '—',
      departure_time: '',
      booking_url: `https://www.kiwi.com/en/search/results/${encodeURIComponent(destination)}`,
    },
    hotel: {
      found: false,
      name: 'Estimated midrange hotel',
      stars: 3,
      price_per_night: hotelEstimate,
      price_total: hotelTotal,
      rating: 7.5,
      address: destination,
      booking_url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`,
    },
    budget_analysis: {
      flight_total: flightTotal,
      hotel_total: hotelTotal,
      daily_spend_estimated: dailySpend,
      daily_spend_total: dailyTotal,
      grand_total: grandTotal,
      per_person_total: perPerson,
      fits_budget: fits,
      budget_remaining: fits ? budgetPerPax - perPerson : 0,
      budget_tier: fits ? 'mid' : 'over',
    },
    alternatives: [],
    _source: 'fallback_estimate',
    _ts: new Date().toISOString(),
  };
}

function estimateFlight(destination) {
  const dest = (destination || '').toLowerCase();
  if (/london|amsterdam|brussels|berlin|madrid|barcelona/.test(dest)) return 80;
  if (/rome|lisbon|prague|vienna|budapest/.test(dest)) return 120;
  if (/athens|istanbul|marrakech/.test(dest)) return 160;
  if (/new york|toronto/.test(dest)) return 420;
  if (/tokyo|bangkok|bali|singapore/.test(dest)) return 550;
  return 180;
}

module.exports = { fetchRealPrices };
