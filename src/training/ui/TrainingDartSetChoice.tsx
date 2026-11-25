import React from 'react';
import DartSetSelector from '../../components/DartSetSelector';
import { getDartSetsForProfile, getFavoriteDartSetForProfile } from '../../lib/dartSetsStore';
export type TrainingSetSnapshot = { id: string; name: string; weightGrams?: number };
export function trainingSetSnapshot(profileId: string, id: string): TrainingSetSnapshot | null {
  const set = id ? getDartSetsForProfile(profileId).find(s => s.id === id) : getFavoriteDartSetForProfile(profileId);
  return set ? {id: set.id, name: set.name, weightGrams: set.weightGrams} : null;
}
export default function TrainingDartSetChoice({profileId, value, onChange, name}: {profileId:string; value:string; onChange:(id:string)=>void; name?:string}) {
  return <div style={{margin:"8px 0"}}>{name && <div style={{fontSize:12,color:"#ff9f8b"}}>{name}</div>}<DartSetSelector profileId={profileId} value={value || null} onChange={id=>onChange(id || "")} /></div>;
}
