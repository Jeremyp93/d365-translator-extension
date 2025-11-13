/* eslint-disable @typescript-eslint/no-explicit-any */
// Content script (isolated world). Only runs UI in the form frame marked by the bridge.

declare global {
  interface Window {
    __d365ContentInstalled?: boolean;
  }
}

if (!window.__d365ContentInstalled) {
  window.__d365ContentInstalled = true;
  // eslint-disable-next-line no-console
  console.log('[content] loaded once in frame:', window.location.href);
} else {
  // eslint-disable-next-line no-console
  console.log('[content] already loaded in this frame, skipping:', window.location.href);
}

let enabled = false;
let cleanup: (() => void) | null = null;

function isEntityReadyFrame(): boolean {
  return document.documentElement.hasAttribute('data-d365-entity-ready');
}

async function sleep(ms: number): Promise<void> {
  // eslint-disable-next-line promise/param-names
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForEntityReady(timeoutMs = 4000): Promise<boolean> {
  const t0 = Date.now();
  while (!isEntityReadyFrame() && Date.now() - t0 < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(50);
  }
  return isEntityReadyFrame();
}

// Post to page and only resolve on replies (to === 'content')
function askPage<T = unknown>(payload: unknown, timeoutMs = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const nonce = Math.random().toString(36).slice(2);

    const onMsg = (ev: MessageEvent) => {
      const d = ev.data;
      if (!d || d.__d365x__ !== true || d.nonce !== nonce || d.to !== 'content') return;
      cleanup();
      // If the bridge returned an error object, surface it
      if (d.payload?.type === 'ERROR') {
        reject(new Error(d.payload?.message ?? 'Bridge error'));
        return;
      }
      resolve(d.payload as T);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('bridge timeout'));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
    };

    window.addEventListener('message', onMsg);
    window.postMessage({ __d365x__: true, nonce, to: 'page', payload }, '*');
  });
}

async function enable(): Promise<void> {
  const ok = await waitForEntityReady();
  if (!ok) {
    // eslint-disable-next-line no-console
    console.warn('[content] Not the entity-ready frame — skipping enable:', window.location.href);
    return;
  }
  if (enabled) {
    // eslint-disable-next-line no-console
    console.log('[content] already enabled in this frame');
    return;
  }

  // 1) Ask for fields first; only enable if there are results
  let fieldsResp: { type: 'FIELDS_FOUND'; fields: { attribute: string; controlName: string; domSelector: string }[] };
  try {
    fieldsResp = await askPage({ type: 'FIND_FIELDS' });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[content] FIND_FIELDS failed:', (e as Error)?.message ?? e);
    return;
  }
  if (!fieldsResp?.fields?.length) {
    // eslint-disable-next-line no-console
    console.warn('[content] No fields found — not enabling in this frame');
    return;
  }

  enabled = true;
  // eslint-disable-next-line no-console
  console.log('[content] ENABLE translation mode — fields:', fieldsResp.fields.length);

  const entity = document.body.getAttribute('data-entitylogicalname') ?? '';
  // eslint-disable-next-line no-console
  console.log('[content] entity:', entity);

  // Apply highlight to all matches
  fieldsResp.fields.forEach((f) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(f.domSelector));
    if (!nodes.length) {
      // eslint-disable-next-line no-console
      console.warn('[content] selector not found for control', f.controlName, 'selector:', f.domSelector);
    }
    nodes.forEach((el) => {
      el.classList.add('d365-translate-target');
      el.setAttribute('data-attribute', f.attribute);
    });
  });

  // Tooltip handling
  let tooltip: HTMLElement | null = null;

  const onClick = async (e: MouseEvent) => {
    if (!enabled) return;
    const wrapper = (e.target as HTMLElement).closest('.d365-translate-target') as HTMLElement | null;
    if (!wrapper) return;

    const attribute = wrapper.getAttribute('data-attribute') ?? '';
    const entityName = document.body.getAttribute('data-entitylogicalname') ?? '';

    try {
      const res = await askPage<{
        type: 'TRANSLATIONS';
        attribute: string;
        labels: { languageCode: number; label: string }[];
      }>({ type: 'GET_TRANSLATIONS', entityLogicalName: entityName, attributeLogicalName: attribute });

      if (tooltip) tooltip.remove();
      tooltip = document.createElement('div');
      tooltip.className = 'd365-translate-tooltip';
      const rows = res.labels
        .map((l) => `<tr><td>${l.languageCode}</td><td>${l.label || '<em>(empty)</em>'}</td></tr>`)
        .join('');
      tooltip.innerHTML = `<h4>${attribute} — translations</h4><table>${rows}</table>`;
      document.body.appendChild(tooltip);

      const rect = wrapper.getBoundingClientRect();
      const x = Math.min(rect.left, window.innerWidth - tooltip.offsetWidth - 12);
      const y = rect.bottom + 8;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[content] GET_TRANSLATIONS failed:', (err as Error)?.message ?? err);
    }
  };

  window.addEventListener('click', onClick, true);

  cleanup = () => {
    if (!enabled) return; // idempotent
    enabled = false;
    // eslint-disable-next-line no-console
    console.log('[content] DISABLE translation mode');
    document.querySelectorAll('.d365-translate-target').forEach((el) => el.classList.remove('d365-translate-target'));
    document.querySelectorAll('.d365-translate-tooltip').forEach((el) => el.remove());
    window.removeEventListener('click', onClick, true);
  };
}

function disable(): void {
  if (!enabled) {
    // eslint-disable-next-line no-console
    console.log('[content] disable: nothing to do in this frame');
    return;
  }
  cleanup?.();
  cleanup = null;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'TOGGLE_TRANSLATION_MODE') {
    // eslint-disable-next-line no-console
    console.log('[content] TOGGLE_TRANSLATION_MODE:', msg.enable, 'frame:', window.location.href);
    if (msg.enable) void enable();
    else disable();
  }
});
