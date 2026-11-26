import { supabase } from "../../lib/supabaseClient";
import type { TrainingDetailedSession } from "../stats/trainingStatsHub";
const KEY="mss_training_goal_optins_v1";
type OptIn={uid:string;goal:string;profile:string};
function load():OptIn[]{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[];}catch{return [];}}
export async function setGoalEnrollment(goal:string,uid:string,profile:string|null){
 const r=await supabase.rpc("ms_training_goal_enroll",{p_goal:goal,p_profile:profile});if(r.error)throw r.error;
 const rows=load().filter(x=>x.goal!==goal||x.uid!==uid);if(profile)rows.push({uid,goal,profile});localStorage.setItem(KEY,JSON.stringify(rows));
}
export async function syncGoalSessions(rows:TrainingDetailedSession[],manual=false){
 const opts=load();if(!opts.length)return;
 const a=await supabase.auth.getSession();const uid=a.data.session?.user.id;if(!uid)return;
 for(const opt of opts.filter(x=>x.uid===uid)){
  const eligible=rows.filter(r=>r.participantType==="player"&&r.participantId===opt.profile&&r.darts>0&&Number.isFinite(r.endedAt)&&Number.isFinite(r.startedAt));
  for(let i=0;i<eligible.length;i+=50){const batch=eligible.slice(i,i+50).map(r=>({id:r.id,mode:r.modeId,started:new Date(r.startedAt).toISOString(),ended:new Date(r.endedAt).toISOString()}));
   const result=await supabase.rpc("ms_training_goal_credit",{p_goal:opt.goal,p_profile:opt.profile,p_sessions:batch});if(result.error&&manual)throw result.error;
  }
 }
}
