/**
 * OFFMAP — route /api/routes/trip (v3 con MCPs)
 * 
 * Acepta dos modos:
 *   A) Modo legacy (llamadas desde loadExperiences): body tiene { model, messages, max_tokens }
 *      → proxy directo a Anthropic API
 *   B) Modo nuevo (gen() principal): body tiene { destination, origin, checkIn, checkOut, budget, travelers, ... }
 *      → busca precios reales con MCPs, luego genera itinerario personalizado
 */

const Anthropic = require('@anthropic-ai/sdk');
const { fetchRealPrices } = require('../services/tripBuilder');
const { genPersonalization } = require('../services/aiPersonalization');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async (req, res) => {
  const body = req.body || {};

  // ── MODO A: proxy legacy (loadExperiences usa este formato) ──
  if (body.model && body.messages) {
    try {
      const msg = await client.messages.create({
        model: body.model,
        max_tokens: body.max_tokens || 2000,
        messages: body.messages,
      });
      return res.status(200).json(msg);
    } catch (e) {
      console.error('[trip] legacy proxy error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── MODO B: búsqueda de precios reales + itinerario ──
  const {
    destination,
    origin = 'Paris',
    checkIn,
    checkOut,
    duration,
    budget,
    travelers = 2,
    preferences = [],
    lang = 'es',
  } = body;

  if (!destination) {
    return res.status(400).json({ error: 'destination is required' });
  }

  // Calcular fechas si no vienen
  const today = new Date();
  const ci = checkIn || (() => {
    const d = new Date(today); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();
  const co = checkOut || (() => {
    const d = new Date(ci); d.setDate(d.getDate() + (duration || 7));
    return d.toISOString().split('T')[0];
  })();
  const days = Math.max(1, Math.round((new Date(co) - new Date(ci)) / 86400000));

  try {
    // 1. Precios reales via MCPs
    const priceData = await fetchRealPrices({
      origin,
      destination,
      checkIn: ci,
      checkOut: co,
      travelers,
      budgetPerPax: budget || 1000,
      lang,
    });

    // 2. Generar itinerario personalizado con Claude
    const itin = await genPersonalization({
      destination,
      origin,
      days,
      travelers,
      preferences,
      budget: budget || 1000,
      priceData,
      lang,
    });

    // 3. Ensamblar respuesta final
    const result = {
      tripId: 'trip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      destination,
      origin,
      checkIn: ci,
      checkOut: co,
      duration: days,
      travelers,
      // Datos de precio reales
      flight: priceData.flight,
      hotel: priceData.hotel,
      budget_analysis: priceData.budget_analysis,
      price_alternatives: priceData.alternatives || [],
      // Contenido del itinerario
      title: itin.title,
      introduction: itin.introduction,
      itinerary: itin.itinerary,
      personalizedTips: itin.tips,
      estimatedCost: {
        budget: priceData.budget_analysis?.per_person_total
          ? Math.round(priceData.budget_analysis.per_person_total * 0.8)
          : null,
        mid: priceData.budget_analysis?.per_person_total || null,
        luxury: priceData.budget_analysis?.per_person_total
          ? Math.round(priceData.budget_analysis.per_person_total * 1.4)
          : null,
      },
      // Meta
      _priceSource: priceData._source,
      generatedAt: new Date().toISOString(),
    };

    return res.status(200).json(result);

  } catch (e) {
    console.error('[trip] generation error:', e);
    return res.status(500).json({ error: 'Trip generation failed', message: e.message });
  }
};
