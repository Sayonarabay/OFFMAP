module.exports=function validate(data){
  const err=[];
  if(!data.destination||typeof data.destination!=='string')err.push('destination required');
  if(!data.tripType||typeof data.tripType!=='string')err.push('tripType required');
  if(!data.duration||typeof data.duration!=='number'||data.duration<1)err.push('duration must be ≥1');
  if(data.duration>30)err.push('duration ≤30 days');
  if(!Array.isArray(data.preferences)||data.preferences.length===0)err.push('preferences required');
  if(typeof data.budget!=='number'||data.budget<0)err.push('budget must be ≥0');
  if(typeof data.travelers!=='number'||data.travelers<1)err.push('travelers ≥1');
  return{valid:err.length===0,errors:err};
};
