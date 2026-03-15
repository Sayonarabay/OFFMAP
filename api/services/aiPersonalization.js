const{createClient}=require('@anthropic-ai/sdk');const config=require('../config');const ai=createClient({apiKey:process.env.ANTHROPIC_API_KEY});
async function genPersonalization(dest,type,trip,prefs,profile){
  const prompt=`You are a travel expert. Given this itinerary, provide personalization.

Destination: ${dest?.name||'Unknown'}
Trip Type: ${type?.name||'General'}
Duration: ${trip?.itinerary?.length||7} days
Daily outline: ${trip?.itinerary?.map((d,i)=>\`Day \${i+1}: \${d.title}\`).join(', ')||'N/A'}
User interests: ${prefs?.join(', ')||'general'}
User age: ${profile?.age||'unknown'}

Respond ONLY as JSON (no markdown):
{
  "introduction": "2-3 sentence personalized trip intro based on interests and destination",
  "tips": ["practical tip 1", "practical tip 2", "practical tip 3"]
}`;
  try{
    const msg=await ai.messages.create({model:config.models.personalization,max_tokens:config.maxTokens.personalization,messages:[{role:'user',content:prompt}]});
    const txt=(msg.content[0]?.text||'').replace(/```json|```/g,'').trim();
    return JSON.parse(txt);
  }catch(e){
    console.error('AI error:',e.message);
    return{introduction:'A wonderful journey awaits.',tips:['Embrace local culture','Travel with an open mind','Document your memories']}
  }
}
module.exports={genPersonalization};
