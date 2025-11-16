// /hooks/useOrgContext.ts
import { useMemo } from 'react';

export interface OrgContext {
  clientUrl: string;
  entity?: string;
  attribute?: string;
  formId?: string;      // systemform.formid (guid, no braces, lowercase)
  labelId?: string;     // cell id (guid, no braces, lowercase) for field labels
  tabId?: string;       // tab id (guid) for tab labels (future)
  sectionId?: string;   // section id (guid) for section labels (future)
  page?: 'field' | 'form'; // optional page selector
}

function cleanGuid(v?: string | null): string | undefined {
  if (!v) return undefined;
  return v.replace(/[{}]/g, '').toLowerCase();
}

export function useOrgContext(): OrgContext {
  return useMemo(() => {
    const qs = new URLSearchParams(location.search);

    const clientUrl = (qs.get('clientUrl') || '').replace(/\/+$/, '');
    const entity = qs.get('entity') || undefined;
    const attribute = qs.get('attribute') || undefined;

    const formId = cleanGuid(qs.get('formId'));
    const labelId = cleanGuid(qs.get('labelId'));
    const tabId = cleanGuid(qs.get('tabId'));
    const sectionId = cleanGuid(qs.get('sectionId'));

    const pageParam = (qs.get('page') || '').toLowerCase();
    const page = (pageParam === 'field' || pageParam === 'form') ? (pageParam as 'field' | 'form') : undefined;

    return {
      clientUrl,
      entity,
      attribute,
      formId,
      labelId,
      tabId,
      sectionId,
      page,
    };
  }, []);
}
