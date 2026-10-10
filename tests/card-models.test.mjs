import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCardModels } from '../src/card-models.mjs';

const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const catalog=JSON.parse(readFileSync(new URL('../data/library.json',import.meta.url),'utf8'));
const models=createCardModels(data,catalog);
const property=(model,label)=>model.rightProperties.find(item=>item.shortLabel===label);

test('clinical preference is independent of susceptibility or regimen inclusion',()=>{
  const cdi=models.pathogen('CDF-121');
  assert.equal(property(cdi,'FDX').preferred,true);
  assert.equal(property(cdi,'VAN').active,true);
  assert.equal(property(cdi,'VAN').preferred,false);
  assert(models.drug('gentamicin').leftProperties.some(item=>item.active));
  assert(models.drug('gentamicin').leftProperties.every(item=>!item.preferred));
});

test('MRSA preference changes with infection site and does not promote daptomycin in pneumonia',()=>{
  const blood=models.pathogen('SAU-002','mrsa-bacteremia');
  const lungs=models.pathogen('SAU-002','mrsa-pneumonia');
  assert.equal(property(blood,'DAP').preferred,true);
  assert.equal(property(blood,'LZD').preferred,false);
  assert.equal(property(lungs,'LZD').preferred,true);
  assert.equal(property(lungs,'DAP').active,false);
  assert.equal(property(lungs,'DAP').preferred,false);
  assert.equal(blood.therapyContext.id,'mrsa-bacteremia');
  assert.equal(lungs.therapyContext.id,'mrsa-pneumonia');
});

test('organ tooltips show diseases for that site and keep meningitis and pneumonia variants separate',()=>{
  const organ=(model,id)=>model.leftProperties.find(item=>item.icon===id);
  const staph=models.pathogen('SAU-001');
  assert.equal(organ(staph,'lungs').tooltip.body,'폐렴');
  assert.equal(organ(staph,'heart').tooltip.body,'심내막염');
  assert.equal(organ(staph,'blood').tooltip.body,'균혈증');
  const meningitis=models.pathogen('SPN-106'),pneumonia=models.pathogen('SPN-107');
  assert.equal(organ(meningitis,'brain').tooltip.body,'세균성 수막염');
  assert.equal(organ(meningitis,'lungs').active,false);
  assert.equal(organ(pneumonia,'lungs').tooltip.body,'지역사회획득 폐렴');
  assert.equal(organ(pneumonia,'brain').active,false);
  assert.equal(organ(models.pathogen('EHI-707'),'liver').tooltip.body,'간농양');
  assert.equal(property(models.pathogen('SAU-002'),'VAN').tooltip.title,'Vancomycin');
});
