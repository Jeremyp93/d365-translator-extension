// /hooks/useOrgContext.ts
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export interface OrgContext {
  clientUrl: string;
  entity?: string;
  attribute?: string;
  formId?: string;
  labelId?: string;
  tabId?: string;
  sectionId?: string;
  page?: 'field' | 'form';
  apiVersion?: string;
}

function cleanGuid(v?: string | null): string | undefined {
  if (!v) return undefined;
  return v.replace(/[{}]/g, '').toLowerCase();
}

function getSearchFromHashRouter(hash: string): string {
  // e.g. "#/report/field?clientUrl=...&formId=..."
  const qIndex = hash.indexOf('?');
  return qIndex >= 0 ? hash.substring(qIndex) : '';
}

export function useOrgContext(): OrgContext {
  const routerLoc = useLocation();

  return useMemo(() => {
    // Prefer React Router's location.search (works in BrowserRouter and HashRouter)
    let search = routerLoc.search;

    // If empty (common with HashRouter when query sits after the #), derive from hash
    if (!search && typeof window !== 'undefined') {
      search = getSearchFromHashRouter(window.location.hash);
    }

    const qs = new URLSearchParams(search || '');

    const clientUrl = (qs.get('clientUrl') || '').replace(/\/+$/, '');
    const entity = qs.get('entity') || undefined;
    const attribute = qs.get('attribute') || undefined;

    const formId = cleanGuid(qs.get('formId'));
    const labelId = cleanGuid(qs.get('labelId'));
    const tabId = cleanGuid(qs.get('tabId'));
    const sectionId = cleanGuid(qs.get('sectionId'));

    const apiVersion = qs.get('apiVersion') || undefined;

    const pageParam = (qs.get('page') || '').toLowerCase();
    const page = pageParam === 'field' || pageParam === 'form' ? (pageParam as 'field' | 'form') : undefined;
    return { clientUrl, entity, attribute, formId, labelId, tabId, sectionId, page, apiVersion };
  }, [routerLoc]);
}
