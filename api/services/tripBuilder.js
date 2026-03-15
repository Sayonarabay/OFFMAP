class TripBuilder{
  assemble(template,dest,days){
    if(!template)return null;
    const itin=template.itinerary?.slice(0,days)||[];
    return{
      itinerary:itin,
      estimatedCosts:template.estimatedCosts||{budget:0,mid:0,luxury:0},
      transportation:template.transportation||{system:'',cost_per_day:0},
      packing:template.packing||[],
      localTips:template.localTips||[],
      title:template.title||'Untitled'
    }
  }
}
module.exports=new TripBuilder();
