const fs=require('fs').promises;
const path=require('path');
class KB{
  constructor(){this.kbPath=path.join(process.cwd(),'kb');this.cache={}}
  async getDestination(id){const d=await this.loadJSON('destinations.json');return d.destinations?.find(x=>x.id===id?.toLowerCase())||null}
  async getTripType(id){const t=await this.loadJSON('trip-types.json');return t.tripTypes?.find(x=>x.id===id?.toLowerCase())||null}
  async getItinerary(dest,type,days){const f=`${dest?.toLowerCase()}-${days}day-${type?.toLowerCase()}.json`;try{return await this.loadJSON(`itineraries/${f}`)}catch(e){if(days!==7){return await this.loadJSON(`itineraries/${dest?.toLowerCase()}-7day-${type?.toLowerCase()}.json`)}throw e}}
  async loadJSON(file){if(this.cache[file])return this.cache[file];const fp=path.join(this.kbPath,file);const txt=await fs.readFile(fp,'utf-8');this.cache[file]=JSON.parse(txt);return this.cache[file]}
  async getVersion(){const m=await this.loadJSON('metadata.json');return m.version}
  clearCache(){this.cache={}}
}
module.exports=new KB();
