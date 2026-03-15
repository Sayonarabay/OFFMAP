const kb=require('../services/knowledgeBase');const{genPersonalization}=require('../services/aiPersonalization');const tb=require('../services/tripBuilder');const validate=require('../utils/validation');
function genTripId(){return'trip_'+Date.now()+'_'+Math.random().toString(36).substr(2,9)}
module.exports=async(req,res)=>{
  try{
    const{valid,errors}=validate(req.body);
    if(!valid)return res.status(400).json({error:'Invalid input',details:errors});
    const{destination,tripType,duration,preferences,budget,travelers,season,userProfile}=req.body;
    let dest,type,itin;
    try{
      dest=await kb.getDestination(destination);
      type=await kb.getTripType(tripType);
      itin=await kb.getItinerary(destination,tripType,duration);
    }catch(e){
      console.error('KB error:',e.message);
      return res.status(404).json({error:'KB data not found',searched:{destination,tripType,duration}});
    }
    if(!dest||!itin)return res.status(404).json({error:'Destination or itinerary not found'});
    const baseTrip=tb.assemble(itin,dest,duration);
    const aiContent=await genPersonalization(dest,type,baseTrip,preferences,userProfile);
    const finalTrip={
      tripId:genTripId(),
      destination:dest.name,
      country:dest.country||'',
      duration,
      title:itin.title,
      introduction:aiContent.introduction,
      itinerary:baseTrip.itinerary,
      personalizedTips:aiContent.tips,
      estimatedCost:baseTrip.estimatedCosts,
      packing:baseTrip.packing,
      localTips:baseTrip.localTips,
      transportation:baseTrip.transportation,
      metadata:{
        generatedAt:new Date().toISOString(),
        kbVersion:await kb.getVersion(),
        personalizationModel:'claude-sonnet-4'
      }
    };
    return res.status(200).json(finalTrip);
  }catch(e){
    console.error('Trip generation error:',e);
    return res.status(500).json({error:'Trip generation failed',message:e.message});
  }
};
