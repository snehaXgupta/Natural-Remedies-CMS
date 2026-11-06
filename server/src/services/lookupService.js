import { LookupValue, LOOKUP_LISTS } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import * as audit from './auditService.js';

export const DEFAULT_LOOKUPS = [
  // Manufacturing Location (Salesforce QEQMS)
  { list: 'manufacturingLocation', value: 'Inhouse', order: 1 },
  { list: 'manufacturingLocation', value: 'CMO', order: 2 },

  // Location detail (for Inhouse)
  { list: 'locationDetail', parent: 'Inhouse', value: '5B (NRPL Pet)-1400', order: 1 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NRPL-Bangalore-1100', order: 2 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NRPL-Anniyalam-AHP-2000', order: 3 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NRPL-Anniyalam-HHP-2100', order: 4 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NLPL- Pithampur Indore-7000', order: 5 },

  // Type of failure (Salesforce QEQMS)
  { list: 'typeOfFailure', value: 'Analytical Difference', order: 1 },
  { list: 'typeOfFailure', value: 'Assay', order: 2 },
  { list: 'typeOfFailure', value: 'Contaminants', order: 3 },
  { list: 'typeOfFailure', value: 'Documentation', order: 4 },
  { list: 'typeOfFailure', value: 'Efficacy', order: 5 },
  { list: 'typeOfFailure', value: 'Foreign matter', order: 6 },
  { list: 'typeOfFailure', value: 'Microbial Parameter', order: 7 },
  { list: 'typeOfFailure', value: 'Packaging Quality', order: 8 },
  { list: 'typeOfFailure', value: 'Physical properties (AOT)', order: 9 },
  { list: 'typeOfFailure', value: 'Physicochemical parameter', order: 10 },
  { list: 'typeOfFailure', value: 'Transit', order: 11 },
  { list: 'typeOfFailure', value: 'Food Safety', order: 12 },
  { list: 'typeOfFailure', value: 'Feed Safety', order: 13 },
  { list: 'typeOfFailure', value: 'Product Quality', order: 14 },
];

export async function all({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { active: true };
  let rows = await LookupValue.find(filter).sort({ list: 1, parent: 1, order: 1, value: 1 }).lean();

  // Merge default QEQMS lookups if not present in DB
  const existingSet = new Set(rows.map((r) => `${r.list}|${(r.parent || '').toLowerCase()}|${r.value.toLowerCase()}`));
  for (const d of DEFAULT_LOOKUPS) {
    const key = `${d.list}|${(d.parent || '').toLowerCase()}|${d.value.toLowerCase()}`;
    if (!existingSet.has(key)) {
      rows.push({
        _id: `default-${d.list}-${d.value}`,
        list: d.list,
        parent: d.parent,
        value: d.value,
        order: d.order,
        active: true,
      });
      existingSet.add(key);
    }
  }

  const lists = {};
  for (const key of Object.keys(LOOKUP_LISTS)) lists[key] = [];
  for (const r of rows) {
    if (lists[r.list]) lists[r.list].push(r);
  }

  // Sort each list by order and then value
  for (const key of Object.keys(lists)) {
    lists[key].sort((a, b) => (a.order || 0) - (b.order || 0) || a.value.localeCompare(b.value));
  }

  return { definitions: LOOKUP_LISTS, lists };
}

function duplicate(err) {
  if (err?.code === 11000) return AppError.validation([{ field: 'value', message: 'This value already exists in the list.' }]);
  return err;
}

async function checkParent(list, parent) {
  const def = LOOKUP_LISTS[list];
  if (!def.parentList) return undefined;
  const parentDef = LOOKUP_LISTS[def.parentList];
  const parentName = parentDef ? parentDef.label.toLowerCase() : 'parent item';
  if (!parent) throw AppError.validation([{ field: 'parent', message: `Choose the ${parentName} this detail belongs to.` }]);
  const ok = await LookupValue.exists({ list: def.parentList, value: parent });
  if (!ok) throw AppError.validation([{ field: 'parent', message: `Unknown ${parentName}.` }]);
  return parent;
}

export async function create({ list, value, parent, order }, actor, context) {
  const p = await checkParent(list, parent);
  let row;
  try {
    row = await LookupValue.create({ list, value, parent: p, order });
  } catch (err) {
    throw duplicate(err);
  }
  await audit.record({ actor, action: 'lookup.create', entityType: 'LookupValue', entityId: row._id, summary: `Added "${value}" to ${LOOKUP_LISTS[list].label}`, context });
  return row.toJSON();
}

/**
 * Rename, reorder or (de)activate. Renaming a parent item also
 * renames the parent of its child details, so they stay attached.
 */
export async function update(id, input, actor, context) {
  const row = await LookupValue.findById(id);
  if (!row) throw AppError.notFound('List value');
  const before = { value: row.value, active: row.active, order: row.order, parent: row.parent };
  if (input.parent !== undefined) row.parent = await checkParent(row.list, input.parent);
  for (const k of ['value', 'order', 'active']) if (input[k] !== undefined) row[k] = input[k];
  try {
    await row.save();
  } catch (err) {
    throw duplicate(err);
  }
  for (const [childKey, childDef] of Object.entries(LOOKUP_LISTS)) {
    if (childDef.parentList === row.list && before.value !== row.value) {
      await LookupValue.updateMany({ list: childKey, parent: before.value }, { $set: { parent: row.value } });
    }
  }
  const changes = audit.diff(before, { value: row.value, active: row.active, order: row.order, parent: row.parent });
  await audit.record({ actor, action: 'lookup.update', entityType: 'LookupValue', entityId: row._id, summary: `Edited "${row.value}" in ${LOOKUP_LISTS[row.list].label}`, ...changes, context });
  return row.toJSON();
}

/**
 * Check D2 selections against active list values. A value that is already
 * saved on the complaint stays valid even if it was deactivated later, so
 * old complaints can still be edited without being forced to change it.
 */
export async function validateSelections({ manufacturingLocation, locationDetail, typeOfFailure }, current = {}) {
  const issues = [];
  const allowed = async (list, value, parent, currentValue) => {
    if (value === undefined || value === null || value === currentValue) return true;
    const isDefault = DEFAULT_LOOKUPS.some(
      (d) =>
        d.list === list &&
        d.value.toLowerCase() === String(value).toLowerCase() &&
        (parent === undefined || (d.parent || '').toLowerCase() === String(parent).toLowerCase())
    );
    if (isDefault) return true;

    const q = { list, value, active: true };
    if (parent !== undefined) q.parent = parent;
    return Boolean(await LookupValue.exists(q).collation({ locale: 'en', strength: 2 }));
  };
  if (!(await allowed('manufacturingLocation', manufacturingLocation, undefined, current.manufacturingLocation))) {
    issues.push({ field: 'investigation.manufacturingLocation', message: 'Choose a manufacturing location from the list.' });
  }
  const location = manufacturingLocation === undefined ? current.manufacturingLocation : manufacturingLocation;
  const detailUnchanged = locationDetail === current.locationDetail && location === current.manufacturingLocation;
  if (locationDetail && !detailUnchanged) {
    if (!location) issues.push({ field: 'investigation.locationDetail', message: 'Choose the manufacturing location first.' });
    else if (!(await allowed('locationDetail', locationDetail, location, undefined))) {
      issues.push({ field: 'investigation.locationDetail', message: `Choose a location detail that belongs to ${location}.` });
    }
  }
  if (!(await allowed('typeOfFailure', typeOfFailure, undefined, current.typeOfFailure))) {
    issues.push({ field: 'investigation.typeOfFailure', message: 'Choose a type of failure from the list.' });
  }
  if (issues.length) throw AppError.validation(issues);
}
