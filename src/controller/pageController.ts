import { getProvisionedLanguagesCached } from "../services/languageService";
import { storageGet } from "../services/storageCache";

/* eslint-disable @typescript-eslint/no-explicit-any */
(function () {
  const w = window as any;
  if (w.__d365Ctl) return; // singleton per frame

  interface Field {
    attribute: string;
    controlName: string;
    labelText: string;
    wrapperSelectors: string[]; // to find the field container
    labelSelectors: string[]; // to find the label INSIDE the wrapper
  }

  const getVersion = (): string => {
    const X = (window as any).Xrm;
    return `v${X?.Utility?.getGlobalContext?.().getVersion?.().slice(0,3) ?? "9.1"}`;
  }

  const ctl: {
    enabled: boolean;
    onClick?: (e: MouseEvent) => void;
    enable: () => Promise<void>;
    disable: () => void;
    showAllFields: () => Promise<void>;
    openFormReportPage: () => Promise<void>;
  } = {
    enabled: false,

    async openFormReportPage() {
      //if (ctl.enabled) return;

      const X = (window as any).Xrm;
      if (!X) {
        console.warn("[ctl] Xrm not found in this frame.");
        return;
      }

      const page = await waitFormReady(6000);
      if (!page) {
        console.warn("[ctl] Form context not ready in this frame.");
        return;
      }

      const entityLogicalName: string =
        page.data.entity.getEntityName?.() ?? "";
        
      const clientUrl =
          (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.() ||
          "";

        const formId =
          (window as any).Xrm?.Page?.ui?.formSelector
            ?.getCurrentItem?.()
            ?.getId?.() ||
          (window as any).Xrm?.Page?.ui?.formSelector?.getId?.() ||
          "";
      window.postMessage(
          {
            __d365x__: true,
            type: "OPEN_FORM_REPORT",
            payload: {
              clientUrl,
              entity: entityLogicalName, // you already have this in scope
              formId,
              apiVersion: getVersion(),
            },
          },
          "*"
        );
    },

    async enable() {
      if (ctl.enabled) return;

      const X = (window as any).Xrm;
      if (!X) {
        console.warn("[ctl] Xrm not found in this frame.");
        return;
      }

      const page = await waitFormReady(6000);
      if (!page) {
        console.warn("[ctl] Form context not ready in this frame.");
        return;
      }

      const entityLogicalName: string =
        page.data.entity.getEntityName?.() ?? "";
      const fields = getFields(page);
      if (!fields.length) {
        console.warn("[ctl] No fields discovered.");
        return;
      }

      applyLabelHighlights(fields);

      // Click → show translations (when clicking the highlighted LABEL)
      ctl.onClick = async (e: MouseEvent) => {
        if (!ctl.enabled) return;
        const el = (e.target as HTMLElement).closest(
          ".d365-translate-target"
        ) as HTMLElement | null;
        if (!el) return;

        // label node carries data-attribute
        const attribute = el.getAttribute("data-attribute") ?? "";
        try {
          await showTranslationsTooltip(el, entityLogicalName, attribute);
        } catch (err) {
          console.warn(
            "[ctl] getTranslations failed:",
            (err as Error)?.message ?? err
          );
        }
      };
      window.addEventListener("click", ctl.onClick, true);

      ctl.enabled = true;
      console.log(
        "[ctl] ENABLED (labels only). entity =",
        entityLogicalName,
        "fields =",
        fields.length
      );
    },

    disable() {
      if (!ctl.enabled) {
        console.log("[ctl] disable: nothing to do.");
        return;
      }
      ctl.enabled = false;
      document
        .querySelectorAll(".d365-translate-target")
        .forEach((n) => n.classList.remove("d365-translate-target"));
      document
        .querySelectorAll(".d365-translate-tooltip")
        .forEach((n) => n.remove());
      if (ctl.onClick) window.removeEventListener("click", ctl.onClick, true);
      console.log("[ctl] DISABLED.");
    },
    /* eslint-disable @typescript-eslint/no-explicit-any */
    async showAllFields() {
      const X = (window as any).Xrm;
      const page = await waitFormReady(6000);
      if (!X || !page) {
        // eslint-disable-next-line no-console
        console.warn("[ctl] Form context not ready for showAllFields().");
        return;
      }

      // Preserve UI context so we don't "jump"
      const prevActiveEl = document.activeElement as HTMLElement | null;
      const prevScrollY = window.scrollY;
      const tabStates: Record<string, string> = {};
      const tabOrder: string[] = [];

      try {
        page.ui.tabs.get().forEach((tab: any) => {
          const name =
            safeGet(() => tab.getName?.()) ??
            Math.random().toString(36).slice(2);
          const state = safeGet(() => tab.getDisplayState?.()) ?? "expanded";
          tabStates[name] = state; // 'expanded' | 'collapsed'
          tabOrder.push(name);
        });
      } catch {
        /* ignore */
      }

      let shownControls = 0;
      let shownSections = 0;
      let shownTabs = 0;

      // 1) Unhide all controls
      try {
        page.ui.controls.get().forEach((ctrl: any) => {
          if (typeof ctrl?.setVisible === "function") {
            try {
              ctrl.setVisible(true);
              shownControls++;
              // Nudge again: some rules flip back same tick
              setTimeout(() => {
                try {
                  ctrl.setVisible(true);
                } catch {
                  /* ignore */
                }
              }, 0);
            } catch {
              /* ignore */
            }
          }
        });
      } catch {
        /* ignore */
      }

      // 2) Unhide all sections (no state change beyond visibility)
      try {
        page.ui.tabs.get().forEach((tab: any) => {
          try {
            tab.sections.get().forEach((sec: any) => {
              if (typeof sec?.setVisible === "function") {
                try {
                  sec.setVisible(true);
                  shownSections++;
                } catch {
                  /* ignore */
                }
              }
            });
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }

      // 3) Unhide all tabs but DO NOT change their display state
      try {
        page.ui.tabs.get().forEach((tab: any) => {
          if (typeof tab?.setVisible === "function") {
            try {
              tab.setVisible(true);
              shownTabs++;
            } catch {
              /* ignore */
            }
          }
          // IMPORTANT: do not call setDisplayState('expanded') here
        });
      } catch {
        /* ignore */
      }

      // 4) Restore original tab display states (in case anything shifted)
      try {
        page.ui.tabs.get().forEach((tab: any, idx: number) => {
          const name = safeGet(() => tab.getName?.()) ?? tabOrder[idx] ?? "";
          const prev = name ? tabStates[name] : undefined;
          if (prev && typeof tab.setDisplayState === "function") {
            try {
              tab.setDisplayState(prev);
            } catch {
              /* ignore */
            }
          }
        });
      } catch {
        /* ignore */
      }

      // 5) Restore focus and scroll
      try {
        if (prevActiveEl && typeof prevActiveEl.focus === "function") {
          prevActiveEl.focus();
        }
      } catch {
        /* ignore */
      }
      try {
        window.scrollTo({
          top: prevScrollY,
          behavior: "instant" as ScrollBehavior,
        });
      } catch {
        window.scrollTo(0, prevScrollY);
      }

      // eslint-disable-next-line no-console
      console.log(
        "[ctl] showAllFields(): controls =",
        shownControls,
        "sections =",
        shownSections,
        "tabs =",
        shownTabs
      );

      function safeGet<T>(fn: () => T): T | undefined {
        try {
          return fn();
        } catch {
          return undefined;
        }
      }
    },
  };

  (window as any).__d365Ctl = ctl;
  console.log(
    "[ctl] controller (labels-only) installed in frame:",
    location.href
  );

  // ---------- helpers ----------

  async function waitFormReady(
    timeoutMs = 6000,
    stepMs = 100
  ): Promise<any | null> {
    const X = (window as any).Xrm;
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      try {
        const page = X?.Page;
        if (page?.data?.entity) return page;
      } catch {
        /* ignore */
      }

      // eslint-disable-next-line promise/param-names
      await new Promise((r) => setTimeout(r, stepMs));
    }
    return null;
  }

  function buildWrapperSelectors(
    controlName: string,
    attribute: string
  ): string[] {
    return [
      // exact common containers
      `[data-id="${controlName}.fieldControl"]`,
      `[data-id="${controlName}-field"]`,
      `[data-id="${attribute}-FieldSectionItemContainer"]`, // <<< NEW (exact hit from your DOM)
      // data-lp-id tokenized/contains
      `[data-lp-id*="|${attribute}|"]`, // e.g., MscrmControls.Containers.FieldSectionItem|elia_day|...
      `[data-lp-id*="${attribute}.fieldControl"]`, // e.g., PowerApps.CoreControls.TextInput|elia_day.fieldControl|...
      // relaxed fallbacks
      `[id*="-${attribute}-FieldSectionItemContainer"]`,
      `[data-id*="${attribute}"]`,
    ];
  }

  function buildLabelSelectors(
    controlName: string,
    attribute: string,
    labelText: string
  ): string[] {
    const safeText = cssEscape(labelText);
    return [
      // most reliable in your DOM:
      `[data-attribute="${attribute}"]`, // <<< NEW (your label has this)
      `label[id$="${attribute}-field-label"]`, // ends-with on id
      `[id*="-${attribute}-field-label"]`,
      // older guesses you had
      `[data-lp-id="${controlName}.label"]`,
      `[data-id="${controlName}-label"]`,
      `label[for="${controlName}"]`,
      `span[title="${safeText}"]`,
      // very generic fallback inside wrapper
      'label, [role="heading"] span, [data-element="label"]',
    ];
  }

  function getFields(page: any): Field[] {
    const out: Field[] = [];
    const attributes = page.data.entity.attributes.get?.() ?? [];
    attributes.forEach((attr: any) => {
      const attribute = attr.getName();
      attr.controls.get().forEach((ctrl: any) => {
        const controlName = ctrl.getName();
        const labelText: string = ctrl.getLabel?.() ?? "";
        // Wrapper selectors: narrow the search scope to the field container
        const wrapperSelectors = buildWrapperSelectors(controlName, attribute);
        // Label selectors: look for label nodes inside the wrapper
        const labelSelectors = buildLabelSelectors(
          controlName,
          attribute,
          labelText
        );
        out.push({
          attribute,
          controlName,
          labelText,
          wrapperSelectors,
          labelSelectors,
        });
      });
    });
    return out;
  }

  function applyLabelHighlights(fields: Field[]): void {
    fields.forEach((f) => {
      // Find a wrapper first (avoids ribbons/toolbars)
      const wrapperSel = f.wrapperSelectors.join(", ");
      const wrappers = Array.from(
        document.querySelectorAll<HTMLElement>(wrapperSel)
      );
      if (!wrappers.length) {
        // If no wrapper, don’t try to match labels globally (too risky)

        console.warn(
          "[ctl] wrapper not found for control",
          f.controlName,
          "selectors:",
          wrapperSel
        );
        return;
      }

      // Within each wrapper, find the label element using selectors + text fallback
      wrappers.forEach((wrap) => {
        const labelNode = findLabelInWrapper(wrap, f);
        if (!labelNode) {
          console.warn(
            "[ctl] label not found inside wrapper for",
            f.controlName
          );
          return;
        }
        labelNode.classList.add("d365-translate-target");
        labelNode.setAttribute("data-attribute", f.attribute);
      });
    });
  }

  function findLabelInWrapper(
    wrapper: HTMLElement,
    f: Field
  ): HTMLElement | null {
    for (const sel of f.labelSelectors) {
      const node = wrapper.querySelector<HTMLElement>(sel);
      if (node) return node;
    }
    if (f.labelText) {
      const want = normalizeText(f.labelText);
      for (const el of Array.from(
        wrapper.querySelectorAll<HTMLElement>("label, span, div")
      )) {
        if (normalizeText(el.textContent || "") === want) return el;
      }
    }
    return null;
  }

  function normalizeText(s: string): string {
    return s.replace(/\s+/g, " ").trim().toLowerCase();
  }

  // CSS.escape polyfill-ish for attribute selectors
  function cssEscape(s: string): string {
    try {
      if (
        typeof (window as any).CSS !== "undefined" &&
        typeof (window as any).CSS.escape === "function"
      ) {
        return (window as any).CSS.escape(s);
      }
    } catch {
      /* ignore */
    }
    return s.replace(/["\\]/g, "\\$&");
  }

  // /* eslint-disable @typescript-eslint/no-explicit-any */
  // async function getTranslations(
  //   X: any,
  //   entityLogicalName: string,
  //   attributeLogicalName: string
  // ): Promise<{ labels: { languageCode: number; label: string }[] }> {
  //   // Helper: normalize anything to an array
  //   const asArray = (v: any): any[] => {
  //     if (!v) return [];
  //     if (Array.isArray(v)) return v;
  //     if (typeof v.get === "function") {
  //       try {
  //         return v.get();
  //       } catch {
  //         /* ignore */
  //       }
  //     }
  //     if (typeof v === "object") return Object.values(v);
  //     return [];
  //   };

  //   // 1) Try the simple way first (works in many orgs)
  //   try {
  //     if (X?.Utility?.getEntityMetadata) {
  //       const meta = await X.Utility.getEntityMetadata(entityLogicalName, [
  //         attributeLogicalName,
  //       ]);
  //       const attrs = asArray(meta.Attributes);
  //       const attr =
  //         attrs.find(
  //           (a: any) =>
  //             (a?.LogicalName ?? "").toLowerCase() ===
  //             attributeLogicalName.toLowerCase()
  //         ) ?? attrs[0];

  //       const labels = asArray(attr?.DisplayName?.LocalizedLabels).map(
  //         (l: any) => ({
  //           languageCode: l.LanguageCode,
  //           label: l.Label,
  //         })
  //       );

  //       if (labels.length) return { labels };
  //     }
  //   } catch {
  //     // swallow and fall through to Web API
  //   }

  //   // 2) Robust fallback: call the metadata Web API route directly using alternate keys
  //   //    GET /api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes(LogicalName='name')?$select=DisplayName
  //   console.log("Robust way needed");
  //   const clientUrl: string =
  //     X?.Utility?.getGlobalContext?.().getClientUrl?.() ??
  //     (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.();
  //   if (!clientUrl) throw new Error("Cannot determine client URL");

  //   const e = encodeURIComponent(entityLogicalName);
  //   const a = encodeURIComponent(attributeLogicalName);
  //   const url = `${clientUrl}/api/data/${getVersion()}/EntityDefinitions(LogicalName='${e}')/Attributes(LogicalName='${a}')?$select=DisplayName`;

  //   const resp = await fetch(url, {
  //     method: "GET",
  //     headers: {
  //       Accept: "application/json",
  //       "OData-MaxVersion": "4.0",
  //       "OData-Version": "4.0",
  //       // If your org requires a bearer, the browser will include it automatically in same-origin.
  //       // No auth header needed in normal D365 pages.
  //     },
  //     credentials: "same-origin",
  //   });

  //   if (!resp.ok) {
  //     const text = await resp.text().catch(() => "");
  //     throw new Error(`Metadata request failed (${resp.status}): ${text}`);
  //   }

  //   const json = await resp.json();

  //   // json.DisplayName is a Label; pull LocalizedLabels if present
  //   const labels = asArray(json?.DisplayName?.LocalizedLabels).map(
  //     (l: any) => ({
  //       languageCode: l.LanguageCode,
  //       label: l.Label,
  //     })
  //   );
  //   return { labels };
  // }

  function removeExistingTooltips(): void {
    document
      .querySelectorAll(".d365-translate-tooltip")
      .forEach((n) => n.remove());
  }

  // function buildEntityVsFormRows(
  //   entityLabels: { languageCode: number; label: string }[],
  //   formLabels: { languageCode: number; label: string }[]
  // ): { lcid: number; entity: string; form: string }[] {
  //   const eMap = new Map(entityLabels.map((l) => [l.languageCode, l.label]));
  //   const fMap = new Map(formLabels.map((l) => [l.languageCode, l.label]));
  //   const all = Array.from(
  //     new Set<number>([...eMap.keys(), ...fMap.keys()])
  //   ).sort((a, b) => a - b);
  //   return all.map((lcid) => ({
  //     lcid,
  //     entity: eMap.get(lcid) || "",
  //     form: fMap.get(lcid) || "",
  //   }));
  // }

  function getBaseUrl(): string {
    const raw =
      (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.() ||
      (window as any).Xrm?.Utility?.getGlobalContext?.().clientUrl ||
      "";
    return String(raw).replace(/\/+$/, "");
  }

  async function fetchJson(url: string, init?: RequestInit): Promise<any> {
    const r = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        ...(init?.headers || {}),
      },
      ...init,
    });
    if (!r.ok)
      throw new Error(`HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    const ct = r.headers.get("content-type") || "";
    return ct.includes("application/json") ? r.json() : null;
  }

  function toArray(v: any): any[] {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v.get === "function") {
      try {
        return v.get();
      } catch {
        /* ignore */
      }
    }
    if (typeof v === "object") return Object.values(v);
    return [];
  }

  async function getEntityDisplayNameLabels(
    entityLogName: string,
    attributeLogName: string
  ): Promise<{ languageCode: number; label: string }[]> {
    const base = getBaseUrl();
    const url =
      `${base}/api/data/${getVersion()}/EntityDefinitions(LogicalName='${encodeURIComponent(
        entityLogName
      )}')` +
      `/Attributes(LogicalName='${encodeURIComponent(
        attributeLogName
      )}')?$select=DisplayName`;
    const j = await fetchJson(url);
    const arr = toArray(j?.DisplayName?.LocalizedLabels);
    return arr.map((l: any) => ({
      languageCode: Number(l.LanguageCode),
      label: String(l.Label ?? ""),
    }));
  }

  function getCurrentFormId(): string | null {
    try {
      const id = (window as any).Xrm?.Page?.ui?.formSelector
        ?.getCurrentItem?.()
        ?.getId?.();
      if (!id) return null;
      return String(id).replace(/[{}]/g, "");
    } catch {
      return null;
    }
  }

  async function getCurrentFormOverrideLabels(
    attributeLogicalName: string
  ): Promise<{ languageCode: number; label: string }[]> {
    const base = getBaseUrl();
    const formId = getCurrentFormId();
    if (!formId) return [];
    const url = `${base}/api/data/${getVersion()}/systemforms(${formId})?$select=formxml`;
    const j = await fetchJson(url);
    const formxml = String(j?.formxml || "");
    if (!formxml) return [];
    const activeTabName = (window as any).Xrm?.Page?.ui?.tabs
      ?.get()
      ?.find((t: any) => t.getDisplayState?.() === "expanded")
      ?.getName?.();
    return parseFormLabelsFromXml(formxml, attributeLogicalName, activeTabName);
  }

  function parseFormLabelsFromXml(
    formxml: string,
    attributeLogicalName: string,
    activeTabName: string
  ): { languageCode: number; label: string }[] {
    try {
      if (!formxml || !attributeLogicalName || !activeTabName) return [];

      const doc = new DOMParser().parseFromString(formxml, "text/xml");
      const attrLower = attributeLogicalName.toLowerCase();
      const tabNameLower = activeTabName.toLowerCase();

      // Find the active <tab name="...">
      const tab = Array.from(doc.getElementsByTagName("tab")).find(
        (t) => (t.getAttribute("name") || "").toLowerCase() === tabNameLower
      );
      if (!tab) return [];

      // Find controls for this attribute inside the active tab only
      const controls = Array.from(tab.getElementsByTagName("control")).filter(
        (c) =>
          (c.getAttribute("datafieldname") || "").toLowerCase() === attrLower
      );
      if (!controls.length) return [];

      // Collect labels from the nearest <cell><labels><label .../></labels></cell>
      const best = new Map<number, string>();
      for (const ctrl of controls) {
        // climb to the nearest <cell>
        let node: Element | null = ctrl.parentElement;
        while (node && node.tagName !== "cell") node = node.parentElement;
        if (!node) continue;

        const labelsNode = Array.from(node.children).find(
          (ch) => ch.tagName === "labels"
        ) as Element | undefined;
        if (!labelsNode) continue;

        for (const ln of Array.from(labelsNode.getElementsByTagName("label"))) {
          const lcid = Number(ln.getAttribute("languagecode") || "");
          if (!Number.isFinite(lcid) || lcid <= 0) continue;
          const text = (ln.getAttribute("description") || "").trim();
          // first non-empty wins for that LCID on this tab
          if (!best.has(lcid) || best.get(lcid) === "") {
            best.set(lcid, text);
          }
        }
      }

      return Array.from(best.entries())
        .map(([languageCode, label]) => ({ languageCode, label }))
        .sort((a, b) => a.languageCode - b.languageCode);
    } catch {
      return [];
    }
  }

  /**
   * Returns the label currently shown to the user and whether it comes from the form (override) or the entity.
   */
  async function getDisplayedLabelInfo(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<{
    lcid: number;
    shown: string;
    source: "form" | "entity";
    entityLabel?: string;
    formLabel?: string;
  }> {
    const X = (window as any).Xrm;
    const fc = X?.Page;

    // 1) Get the label actually rendered on the page
    const ctrl =
      fc?.getControl?.(attributeLogicalName) ??
      fc?.ui?.controls
        ?.get?.()
        .find((c: any) => c?.getName?.() === attributeLogicalName);
    const shown = ctrl?.getLabel?.() ?? "";

    // 2) Determine user LCID
    const lcid =
      X?.Utility?.getGlobalContext?.().userSettings?.languageId ?? 1033;

    // 3) Fetch the entity DisplayName for this attribute (for comparison)
    const clientUrl = X?.Utility?.getGlobalContext?.().getClientUrl?.();
    const url = `${clientUrl}/api/data/${getVersion()}/EntityDefinitions(LogicalName='${encodeURIComponent(
      entityLogicalName
    )}')/Attributes(LogicalName='${encodeURIComponent(
      attributeLogicalName
    )}')?$select=DisplayName`;
    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      credentials: "same-origin",
    });
    const j = r.ok ? await r.json() : {};
    const entityLabel =
      (j?.DisplayName?.LocalizedLabels || []).find(
        (x: any) => x.LanguageCode === lcid
      )?.Label || "";

    // 4) Get the form override (if any) by asking the control itself
    // If a control label is set on the form for this LCID, getLabel() returns it.
    // If no override exists, many orgs return the entity label here.
    const formLabel = shown;

    // 5) Decide the source
    const source: "form" | "entity" =
      formLabel && formLabel !== entityLabel ? "form" : "entity";

    return { lcid, shown, source, entityLabel, formLabel };
  }

  async function getTooltipHighlightContext(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<{ userLcid: number; source: "form" | "entity" }> {
    const X = (window as any).Xrm;
    const userLcid =
      X?.Utility?.getGlobalContext?.().userSettings?.languageId ?? 1033;

    const { source } = await getDisplayedLabelInfo(
      entityLogicalName,
      attributeLogicalName
    );

    return { userLcid, source };
  }

  const LCID_NAMES: Record<number, string> = {
    1025: "Arabic (Saudi Arabia)",
    1028: "Chinese (Traditional, Taiwan)",
    1030: "Danish (Denmark)",
    1031: "German (Germany)",
    1032: "Greek (Greece)",
    1033: "English (United States)",
    1034: "Spanish (Spain - Traditional)",
    1035: "Finnish (Finland)",
    1036: "French (France)",
    1037: "Hebrew (Israel)",
    1038: "Hungarian (Hungary)",
    1040: "Italian (Italy)",
    1041: "Japanese (Japan)",
    1042: "Korean (Korea)",
    1043: "Dutch (Netherlands)",
    1044: "Norwegian Bokmål (Norway)",
    1045: "Polish (Poland)",
    1046: "Portuguese (Brazil)",
    1048: "Romanian (Romania)",
    1049: "Russian (Russia)",
    1050: "Croatian (Croatia)",
    1051: "Slovak (Slovakia)",
    1053: "Swedish (Sweden)",
    1055: "Turkish (Türkiye)",
    1057: "Indonesian (Indonesia)",
    1058: "Ukrainian (Ukraine)",
    1060: "Slovenian (Slovenia)",
    1061: "Estonian (Estonia)",
    1062: "Latvian (Latvia)",
    1063: "Lithuanian (Lithuania)",
    2052: "Chinese (Simplified, PRC)",
    2057: "English (United Kingdom)",
    2060: "French (Belgium)",
    2067: "Dutch (Belgium)",
    2070: "Portuguese (Portugal)",
    3082: "Spanish (Spain - Modern)",
  };

  function lcidToName(lcid: number): string {
    return LCID_NAMES[lcid] ?? `Language ${lcid}`;
  }
  const TTL_MS_DEFAULT = 6 * 60 * 60 * 1000; // 6h
  async function getProvisionedLanguagesCached(
    baseUrl: string,
    opts: { ttlMs?: number } = {}
  ): Promise<number[]> {
    const ttlMs = opts.ttlMs ?? TTL_MS_DEFAULT;
    const key = "provLangs";

    const cached = localStorage.getItem(
      `d365x:${key}:${(baseUrl || "").replace(/\/+$/, "").toLowerCase()}`
    );
    const { langs, when } = cached ? await JSON.parse(cached) : {};
    if (cached && Array.isArray(langs) && Date.now() - when < ttlMs) {
      return langs.slice();
    }

    const live = await getProvisionedLanguageLcids(baseUrl);
    localStorage.setItem(
      `d365x:${key}:${(baseUrl || "").replace(/\/+$/, "").toLowerCase()}`,
      JSON.stringify({ langs: live, when: Date.now() })
    );
    return live;
  }

  async function getProvisionedLanguageLcids(
    clientUrl: string
  ): Promise<number[]> {
    // Try the unbound Web API function first
    try {
      console.log(
        localStorage.getItem(
          "d365x:provLangs:https://org77b6bb32.crm4.dynamics.com"
        )
      );
    } catch (error) {
      console.error("Error fetching provisioned languages from cache:", error);
    }
    try {
      const r = await fetch(
        `${clientUrl}/api/data/${getVersion()}/RetrieveProvisionedLanguages()`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
          },
          credentials: "same-origin",
        }
      );
      if (r.ok) {
        const j = await r.json();
        // Dataverse returns something like: { "LocaleIds": [1033, 1036, 1043, ...] }
        const ids = (j?.RetrieveProvisionedLanguages ??
          j?.localeids ??
          j?.value) as number[] | undefined;
        if (Array.isArray(ids) && ids.length)
          return Array.from(new Set(ids)).sort((a, b) => a - b);
      }
    } catch {
      /* fall through */
    }
    // Fallback: empty array → caller will union with whatever labels we already have
    return [];
  }

  interface LabelRow {
    lcid: number;
    entity?: string;
    form?: string;
  }

  function toLabelMap(labels: { languageCode: number; label: string }[]) {
    const m = new Map<number, string>();
    for (const l of labels) {
      if (Number.isFinite(l.languageCode)) m.set(l.languageCode, l.label ?? "");
    }
    return m;
  }

  // safe attribute selector escape
  function cssEscapeAttr(v: string) {
    return String(v).replace(/["\\]/g, (m) => `\\${m}`);
  }

  /** Header: <header><rows><row><cell id=..><control datafieldname="..."/></cell> */
async function getCellLabelIdInHeader(
  clientUrl: string,
  formId: string,
  attributeLogicalName: string
): Promise<string | null> {
  const sysformUrl = `${clientUrl.replace(/\/+$/, '')}/api/data/${getVersion()}/systemforms(${formId})?$select=formxml`;
  const j = await fetchJson(sysformUrl);
  const xml = String(j?.formxml || '');
  if (!xml) return null;

  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const header = doc.querySelector('header');
  if (!header) return null;

  const sel = `cell > control[datafieldname="${cssEscapeAttr(attributeLogicalName)}"]`;
  const ctrl = header.querySelector(sel) as Element | null;
  if (!ctrl) return null;

  const cell = ctrl.closest('cell') as Element | null;
  const labelId = (cell?.getAttribute('id') || '').replace(/[{}]/g, '').toLowerCase();
  return labelId || null;
}

  /** Read systemform + parse and return the <cell id> that hosts the control for `attribute` on the active tab */
  async function getCellLabelIdOnActiveTab(
    clientUrl: string,
    formId: string,
    attributeLogicalName: string,
    activeTabName?: string,
    activeTabId?: string
  ): Promise<string | null> {
    if (!clientUrl || !formId) return null;

    // 1) Read the formxml
    const sysformUrl = `${clientUrl.replace(
      /\/+$/,
      ""
    )}/api/data/${getVersion()}/systemforms(${formId})?$select=formxml`;
    const j = await fetchJson(sysformUrl);
    const xml = String(j?.formxml || "");
    if (!xml) return null;

    // 2) Parse and focus the active <tab>
    const doc = new DOMParser().parseFromString(xml, "text/xml");

    // Try to match by name (preferred), then by id
    let tabEl: Element | null = null;
    if (activeTabName) {
      tabEl = doc.querySelector(`tab[name="${cssEscapeAttr(activeTabName)}"]`);
    }
    if (!tabEl && activeTabId) {
      tabEl = doc.querySelector(`tab[id="${cssEscapeAttr(activeTabId)}"]`);
    }
    // If still not found, fallback to the first tab
    if (!tabEl) tabEl = doc.querySelector("tab");
    if (!tabEl) return null;

    // 3) Inside the active tab, find the cell whose control has datafieldname=attribute
    const sel = `cell > control[datafieldname="${cssEscapeAttr(
      attributeLogicalName
    )}"]`;
    const control = tabEl.querySelector(sel) as Element | null;
    if (!control) return null;

    const cell = control.closest("cell") as Element | null;
    if (!cell) return null;

    // 4) For field labels, UpdateLocLabels expects the enclosing <cell id> as LabelId
    const labelId = (cell.getAttribute("id") || "")
      .replace(/[{}]/g, "")
      .toLowerCase();
    return labelId || null;
  }

  function buildRowsAllLanguages(
    allLcids: number[],
    entityLabels: { languageCode: number; label: string }[],
    formLabels: { languageCode: number; label: string }[]
  ): LabelRow[] {
    const ent = toLabelMap(entityLabels);
    const frm = toLabelMap(formLabels);

    // If RetrieveProvisionedLanguages() failed, ensure we still show every LCID we observed
    const lcidSet = new Set<number>(allLcids);
    for (const k of ent.keys()) lcidSet.add(k);
    for (const k of frm.keys()) lcidSet.add(k);

    return Array.from(lcidSet)
      .sort((a, b) => a - b)
      .map((lcid) => ({
        lcid,
        entity: ent.get(lcid) ?? "", // empty means show "—"
        form: frm.get(lcid) ?? "",
      }));
  }

  async function showTranslationsTooltip(
    targetEl: HTMLElement,
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<void> {
    removeExistingTooltips();

    const [entityLabels, formLabels] = await Promise.all([
      getEntityDisplayNameLabels(entityLogicalName, attributeLogicalName),
      getCurrentFormOverrideLabels(attributeLogicalName),
    ]);

    const X = (window as any).Xrm;
    const clientUrl = X?.Utility?.getGlobalContext?.().getClientUrl?.() || "";

    // 1) Get full language list
    const provisioned = await getProvisionedLanguagesCached(clientUrl);

    // 2) Build rows for ALL languages (fill missing with empty)
    const rows = buildRowsAllLanguages(provisioned, entityLabels, formLabels);
    console.log(rows);

    //const rows = buildEntityVsFormRows(entityLabels, formLabels);

    // render tooltip (now returns the DOM node)
    showTooltip(targetEl, entityLogicalName, attributeLogicalName, rows);
  }

  async function showTooltip(
    targetEl: HTMLElement,
    entityLogicalName: string,
    attribute: string,
    rows: LabelRow[]
  ): Promise<void> {
    // document
    //   .querySelectorAll(".d365-translate-tooltip")
    //   .forEach((n) => n.remove());

    // figure out current LCID + source column
    const { userLcid, source } = await getTooltipHighlightContext(
      entityLogicalName,
      attribute
    );

    const htmlRows = rows
      .map((r) => {
        const isCurrent = r.lcid === userLcid;
        // apply column highlight only on the current LCID row
        const entityClass = isCurrent && source === "entity" ? " hl-col" : "";
        const formClass = isCurrent && source === "form" ? " hl-col" : "";
        const rowClass = isCurrent ? " is-current-row" : "";

        return `
        <tr class="${rowClass}">
          <td class="lcid-cell">${lcidToName(r.lcid)} (${r.lcid})</td>
          <td class="entity-cell${entityClass}">${
          r.entity ? escapeHtml(r.entity) : "<em>—</em>"
        }</td>
          <td class="form-cell${formClass}">${
          r.form ? escapeHtml(r.form) : "<em>—</em>"
        }</td>
        </tr>`;
      })
      .join("");

    const tip = document.createElement("div");
    tip.className = "d365-translate-tooltip";

    tip.innerHTML = `
    <div style="position:relative;padding-right:20px">
      <button
        class="d365x-tip-close"
        aria-label="Close"
        title="Close"
        style="
          position:absolute;top:-6px;right:-6px;
          width:22px;height:22px;line-height:22px;
          border:1px solid rgba(255,255,255,.2);
          border-radius:50%;
          background:#222;color:#fff; cursor:pointer;
          display:flex;align-items:center;justify-content:center;
        "
      >×</button>
      <h4 style="margin-right:8px">${attribute} — translations</h4>
      <table class="d365-tip-table">
      <thead><tr><th>LCID</th><th>Entity</th><th>Form</th></tr></thead>
      <tbody>
        ${htmlRows}
      </tbody>
    </table>
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end">
        <button id="d365x-open-report" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#1f6feb;color:#fff;cursor:pointer">
          View full translations
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(tip);

    positionTooltipNear(tip, targetEl); // Wire the button

    const cleanup = () => {
      tip.remove();
    };

    const onCloseBtn = (e: MouseEvent) => {
      e.stopPropagation();
      cleanup();
    };

    tip
      .querySelector<HTMLButtonElement>(".d365x-tip-close")
      ?.addEventListener("click", onCloseBtn);

    // Wire the button
    const btn = tip.querySelector<HTMLButtonElement>("#d365x-open-report");
    // if (btn) {
    //   btn.addEventListener("click", (e) => {
    //     e.stopPropagation();
    //     openTranslationReport(entityLogicalName, attribute);
    //   });
    // }
    const clickedRegion: 'header' | 'footer' | 'tab' = isInHeader(targetEl)
    ? 'header'
    : 'tab';
    if (btn) {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const clientUrl =
          (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.() ||
          "";

        const formId =
          (window as any).Xrm?.Page?.ui?.formSelector
            ?.getCurrentItem?.()
            ?.getId?.() ||
          (window as any).Xrm?.Page?.ui?.formSelector?.getId?.() ||
          "";

        const tabs = (window as any).Xrm?.Page?.ui?.tabs?.get?.() || [];
        const activeTab = tabs.find(
          (t: any) => t?.getDisplayState?.() === "expanded"
        );
        const activeTabName = activeTab?.getName?.() || "";
        const activeTabId = activeTab?.getId?.()
          ? activeTab.getId()
          : activeTab?.getId;

        let labelId: string | null = null;
    try {
      // Try best resolver based on where the click happened
      if (clickedRegion === 'header') {
        labelId = await getCellLabelIdInHeader(clientUrl, formId, attribute);
        if (!labelId) {
          // fallback to tab if header didn’t have a distinct cell/label
          labelId = await getCellLabelIdOnActiveTab(clientUrl, formId, attribute, activeTabName, activeTabId);
        }
      } else {
        // default: active tab
        labelId = await getCellLabelIdOnActiveTab(clientUrl, formId, attribute, activeTabName, activeTabId);
        if (!labelId) {
          // fallback to header/footer in case the field is placed there
          labelId = await getCellLabelIdInHeader(clientUrl, formId, attribute)
        }
      }
    } catch (err) {
      console.warn("Could not resolve labelId:", err);
    }
        // Ask the relay (content world) → background to open a new tab
        window.postMessage(
          {
            __d365x__: true,
            type: "OPEN_REPORT",
            payload: {
              clientUrl,
              entity: entityLogicalName, // you already have this in scope
              attribute, // existing param
              formId,
              labelId,
            },
          },
          "*"
        );
      });
    }
  }

  function elClosest(el: HTMLElement | null, sel: string): HTMLElement | null {
  return el ? (el.closest(sel) as HTMLElement | null) : null;
}

/** Heuristic: is the clicked label inside the sticky form header area? */
function isInHeader(el: HTMLElement): boolean {
  // Common patterns in UCI header DOM
  if (elClosest(el, '[data-id$="-header"], [data-id*="header"]')) return true;
  if (elClosest(el, '[data-lp-id*="Header"], [data-lp-id*="header"]')) return true;
  if (elClosest(el, '[id*="-header"], [id^="header"], [id$="-header"]')) return true;
  // Last resort: header containers often have aria attributes or role hints
  if (elClosest(el, '[role="banner"]')) return true;
  return false;
}

  function escapeHtml(s: string): string {
    return String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c]!)
    );
  }

  function positionTooltipNear(tip: HTMLElement, targetEl: HTMLElement): void {
    const margin = 8;

    // Attach hidden to measure
    tip.style.visibility = "hidden";
    tip.style.left = "0px";
    tip.style.top = "0px";
    document.body.appendChild(tip);

    const rect = targetEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;

    // Horizontal clamp
    let x = rect.left;
    const maxX = vw - tw - margin;
    if (x > maxX) x = Math.max(margin, maxX);
    if (x < margin) x = margin;

    // Vertical: try below; if not, above; else clamp to best available
    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let y: number;
    if (spaceBelow >= th) {
      y = rect.bottom + margin;
    } else if (spaceAbove >= th) {
      y = rect.top - th - margin;
    } else if (spaceBelow >= spaceAbove) {
      y = Math.min(rect.bottom + margin, vh - th - margin);
    } else {
      y = Math.max(margin, rect.top - th - margin);
    }

    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y + window.scrollY)}px`;
    tip.style.visibility = "visible";
  }
})();
