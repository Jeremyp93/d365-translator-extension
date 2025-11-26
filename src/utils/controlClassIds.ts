/**
 * Map of common Dynamics 365 control class IDs to their descriptions
 */
export const controlClassIds: Record<string, string> = {
  '{270BD3DB-D9AF-4782-9025-509E298DEC0A}': 'Lookup',
  '{4273EDBD-AC1D-40D3-9FB2-095C621B552D}': 'Single Line of Text',
  '{5B773807-9FB2-42DB-97C3-7A91EFF8ADFF}': 'Date and Time',
  '{71716B6C-711E-476C-8AB8-5D11542BFB47}': 'Sub-grid',
  '{E0DECE4B-6FC8-4A8F-A065-082708572369}': 'Multiple Lines of Text',
  '{5546F871-39F4-4F90-B2A8-277A2D166DC0}': 'Timeline',
  '{06375649-C143-495E-A496-C962E5B4488E}': 'Map',
  '{F9A8A302-114E-466A-B582-6771B2AE0D92}': 'Notes',
  '{B0C6723A-8503-4FD7-BB28-C8A06AC933C2}': 'Multi-line Text',
  '{533B9E00-756B-4312-95A0-DC888637AC78}': 'Currency',
  '{AA987274-CE4E-4271-A803-66164311A958}': 'Date Time Picker',
  '{0D2C745A-E5A8-4C8F-BA63-C6D3BB604660}': 'Floating Point Number',
  '{ADA2203E-B4CD-49BE-9DDF-234642B43B52}': 'Email',
  '{06A54411-B59E-4B62-B96B-33B542CFA36E}': 'URL',
  '{67FAC785-CD58-4F9F-ABB3-4B7DDC6ED5ED}': 'Two Options',
  '{C3EFE0C3-0EC6-42BE-8349-CBD9079DFD8E}': 'Decimal Number',
  '{9C5CA0A1-AB4D-4781-BE7E-8DFBE867B87E}': 'Currency',
  '{5D68B988-0661-4DB2-BC3E-17598AD3BE6C}': 'Status Reason',
  '{67FCF3CD-5004-488B-8A06-7E7BEB08FD84}': 'Toggle',
  '{4AA28AB7-9C13-4F57-A73D-AD894D048B5F}': 'MultiSelect Option Set',
  '{FD2A7985-3187-444E-908D-6624B4F99995}': 'Action Cards',
  '{E7A81278-8635-4D9E-8D4D-59480B391C5B}': 'Knowledge Base Search',
  '{5C5600E0-1D6E-4205-A272-BE80DA87FD42}': 'Quick View Form',
  '{3EF39988-22BB-4f0b-BBBE-64B5A3748AEE}': 'Option Set',
  '{C6D124CA-7EDA-4a60-AEA9-7FB8D318B68F}': 'Whole Number',
  '{5546E6CD-394C-4bee-94A8-4425E17EF6C6}': 'Unique ID'
};

/**
 * Get control type description from class ID
 * @param classId - The control's class ID (GUID)
 * @returns Description like "Lookup" or the classId if unknown
 */
export function getControlTypeName(classId: string | undefined): string {
  if (!classId) return '(none)';
  
  const upperClassId = classId.toUpperCase().trim();
  const description = controlClassIds[upperClassId];
  
  return description ? `${description} - ${classId}` : classId;
}

/**
 * Non-editable control types that should not have editable labels
 * These are container or special controls, not actual data fields
 */
const nonEditableControlTypes = new Set([
  '{71716B6C-711E-476C-8AB8-5D11542BFB47}', // Sub-grid
  '{5C5600E0-1D6E-4205-A272-BE80DA87FD42}', // Quick View Form
  '{5546F871-39F4-4F90-B2A8-277A2D166DC0}', // Timeline
  '{06375649-C143-495E-A496-C962E5B4488E}', // Map
  '{F9A8A302-114E-466A-B582-6771B2AE0D92}', // Notes
  '{FD2A7985-3187-444E-908D-6624B4F99995}', // Action Cards
  '{E7A81278-8635-4D9E-8D4D-59480B391C5B}', // Knowledge Base Search
]);

/**
 * Check if a control type should have editable labels
 * @param classId - The control's class ID (GUID)
 * @returns true if labels should be editable, false for container/special controls
 */
export function isEditableControlType(classId: string | undefined): boolean {
  if (!classId) return true; // Default to editable if no classId
  
  const upperClassId = classId.toUpperCase().trim();
  return !nonEditableControlTypes.has(upperClassId);
}
