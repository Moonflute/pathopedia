import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCardSearch} from '../src/card-search.mjs';

const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const catalog=JSON.parse(readFileSync(new URL('../data/library.json',import.meta.url),'utf8'));

test('all drugs have searchable Korean names and pathogen common names match existing cards',()=>{
  const search=createCardSearch(data,catalog);
  for(const drug of data.drugs){
    const names=catalog.drugs[drug.id].searchAliases;
    assert(names?.some(name=>/[가-힣]/u.test(name)),drug.id);
    assert(names.every(name=>search.matches('drug',drug.id,name)),drug.id);
  }
  assert(search.matches('drug','vancomycin','반코마이신'));
  assert(search.matches('pathogen','SAU-001','황색포도상구균'));
  const pneumococcus=data.records.find(record=>record.taxonId==='spn');
  assert(search.matches('pathogen',pneumococcus.id,'폐렴구균'));
  for(const record of data.records)assert(search.matches('pathogen',record.id,record.koreanName),record.id);
});

test('spacing, separators, letter case, and Hangul composition do not prevent a name match',()=>{
  const search=createCardSearch(data,catalog);
  for(const query of ['피페라실린 타조박탐','피페라실린타조박탐','피페라실린-타조박탐'])assert(search.matches('drug','piptazo',query),query);
  assert(search.matches('drug','vancomycin','반코마이신'.normalize('NFD')));
  assert(search.matches('drug','vancomycin','  VANCOMYCIN  '));
  assert(search.matches('pathogen','SAU-001','Ｓｔａｐｈｙｌｏｃｏｃｃｕｓ　ａｕｒｅｕｓ'));
});

test('Korean names and phenotype terms can narrow a resistance search without adding other cards',()=>{
  const search=createCardSearch(data,catalog);
  assert(search.matches('pathogen','SAU-002','황색포도상구균 MRSA'));
  assert.equal(search.matches('pathogen','SAU-001','황색포도상구균 MRSA'),false);
  assert.equal(search.matches('drug','vancomycin','반코마이신 일치하지않는검색어'),false);
  assert.equal(search.matches('pathogen','missing',''),false);
  assert(search.matches('pathogen','SAU-001',''));
});
