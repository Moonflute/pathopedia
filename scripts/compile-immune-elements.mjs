const present = value => typeof value === 'string' && value.trim().length > 0;
const fail = message => { throw Error('Immune card content: ' + message); };

export function compileImmuneElements(authored, sources) {
  if (authored?.schemaVersion !== 1 || authored.locale !== 'ko-KR' || !present(authored.version)) fail('invalid metadata');
  if (!Array.isArray(authored.categories) || !authored.categories.length || !Array.isArray(authored.entities) || !authored.entities.length) fail('missing categories or entities');

  const immuneCategories = {};
  for (const [index, category] of authored.categories.entries()) {
    if (!/^[a-z][a-z-]*$/.test(category?.id || '') || !present(category.label) || immuneCategories[category.id]) fail('invalid or duplicate category');
    immuneCategories[category.id] = { id:category.id, label:category.label, sortOrder:index + 1 };
  }

  const immuneElements = {};
  for (const [index, entry] of authored.entities.entries()) {
    const id = entry?.id;
    if (!/^IMM-[0-9]{3}$/.test(id || '') || immuneElements[id]) fail('invalid or duplicate ID: ' + id);
    if (!immuneCategories[entry.category] || !present(entry.name) || !present(entry.englishName)) fail(id + ' has invalid identity');
    if (!present(entry.summary) || [...entry.summary].length < 20 || [...entry.summary].length > 160 || !present(entry.detail) || entry.summary === entry.detail) fail(id + ' has invalid summary or detail');
    if (!Array.isArray(entry.sourceIds) || !entry.sourceIds.length || new Set(entry.sourceIds).size !== entry.sourceIds.length || entry.sourceIds.some(sourceId => !sources[sourceId])) fail(id + ' has invalid sources');
    immuneElements[id] = {
      id, kind:'immune-element', name:entry.name, englishName:entry.englishName,
      category:entry.category, sortOrder:index + 1, summary:entry.summary,
      back:{sections:[{id:'role', title:'핵심 특징', text:entry.detail, sourceIds:entry.sourceIds}]},
      sourceIds:entry.sourceIds, reviewStatus:'educational-draft'
    };
  }

  return { immuneElements, immuneCategories, immuneContent:{version:authored.version, locale:authored.locale} };
}
