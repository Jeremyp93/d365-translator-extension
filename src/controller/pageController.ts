/* eslint-disable @typescript-eslint/no-explicit-any */
const w = window as any;
if (!w.__d365Ctl) {
  // singleton per frame - only initialize once

  // Language names mapping (inlined from utils/languageNames.ts for content script compatibility)
  const languageNames: Record<number, string> = {
    1025: 'Arabic (Saudi Arabia)', 1026: 'Bulgarian (Bulgaria)', 1027: 'Catalan (Catalan)',
    1028: 'Chinese (Traditional)', 1029: 'Czech (Czech Republic)', 1030: 'Danish (Denmark)',
    1031: 'German (Germany)', 1032: 'Greek (Greece)', 1033: 'English (United States)',
    1035: 'Finnish (Finland)', 1036: 'French (France)', 1037: 'Hebrew (Israel)',
    1038: 'Hungarian (Hungary)', 1040: 'Italian (Italy)', 1041: 'Japanese (Japan)',
    1042: 'Korean (Korea)', 1043: 'Dutch (Netherlands)', 1044: 'Norwegian (Bokmål)',
    1045: 'Polish (Poland)', 1046: 'Portuguese (Brazil)', 1048: 'Romanian (Romania)',
    1049: 'Russian (Russia)', 1050: 'Croatian (Croatia)', 1051: 'Slovak (Slovakia)',
    1053: 'Swedish (Sweden)', 1054: 'Thai (Thailand)', 1055: 'Turkish (Turkey)',
    1057: 'Indonesian (Indonesia)', 1058: 'Ukrainian (Ukraine)', 1060: 'Slovenian (Slovenia)',
    1061: 'Estonian (Estonia)', 1062: 'Latvian (Latvia)', 1063: 'Lithuanian (Lithuania)',
    1066: 'Vietnamese (Vietnam)', 1069: 'Basque (Basque)', 1081: 'Hindi (India)',
    1086: 'Malay (Malaysia)', 1087: 'Kazakh (Kazakhstan)', 1110: 'Galician (Galician)',
    2052: 'Chinese (Simplified)', 2070: 'Portuguese (Portugal)', 2074: 'Serbian (Latin)',
    3076: 'Chinese (Hong Kong SAR)', 3082: 'Spanish (Spain)', 3084: 'French (Canada)',
    5146: 'Bosnian (Bosnia and Herzegovina)',
  };

  interface Field {
    attribute: string;
    controlName: string;
    labelText: string;
  }

  type LabelIndex = Map<string, HTMLElement[]>;

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
    openPluginTraceLogsPage: () => Promise<void>;
    openGlobalOptionSetsPage: () => Promise<void>;
    openEntityBrowserPage: () => Promise<void>;
  } = {
    enabled: false,

    async openEntityBrowserPage() {
      const X = (window as any).Xrm;
      if (!X) {
        if (__DEV__) console.warn("[ctl] Xrm not found in this frame.");
        return;
      }

      const clientUrl =
        (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.() || "";

      window.postMessage(
        {
          __d365x__: true,
          type: "OPEN_ENTITY_BROWSER",
          payload: {
            clientUrl,
            apiVersion: getVersion(),
          },
        },
        "*"
      );
    },

    async openGlobalOptionSetsPage() {
      const X = (window as any).Xrm;
      if (!X) {
        if (__DEV__) console.warn("[ctl] Xrm not found in this frame.");
        return;
      }

      const clientUrl =
        (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.() || "";

      window.postMessage(
        {
          __d365x__: true,
          type: "OPEN_GLOBAL_OPTIONSETS",
          payload: {
            clientUrl,
            apiVersion: getVersion(),
          },
        },
        "*"
      );
    },

    async openPluginTraceLogsPage() {
      //if (ctl.enabled) return;

      const X = (window as any).Xrm;
      if (!X) {
        if (__DEV__) console.warn("[ctl] Xrm not found in this frame.");
        return;
      }
        
      const clientUrl =
          (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.() ||
          "";

      window.postMessage(
          {
            __d365x__: true,
            type: "OPEN_PLUGIN_REPORT",
            payload: {
              clientUrl,
              apiVersion: getVersion(),
            },
          },
          "*"
        );
    },

    async openFormReportPage() {
      //if (ctl.enabled) return;

      const X = (window as any).Xrm;
      if (!X) {
        if (__DEV__) console.warn("[ctl] Xrm not found in this frame.");
        return;
      }

      const page = await waitFormReady(500);
      let entityLogicalName = "";
      let formId = "";
      if (!page) {
        if (__DEV__) console.warn("[ctl] Form context not ready in this frame.");
        //return;
      } else {
        entityLogicalName =
        page.data.entity.getEntityName?.() ?? "";
        formId =
          (window as any).Xrm?.Page?.ui?.formSelector
            ?.getCurrentItem?.()
            ?.getId?.() ||
          (window as any).Xrm?.Page?.ui?.formSelector?.getId?.() ||
          "";
      }

      const clientUrl =
          (window as any).Xrm?.Utility?.getGlobalContext?.().getClientUrl?.() ||
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
        if (__DEV__) console.warn("[ctl] Xrm not found in this frame.");
        return;
      }

      const page = await waitFormReady(6000);
      if (!page) {
        if (__DEV__) console.warn("[ctl] Form context not ready in this frame.");
        return;
      }

      const entityLogicalName: string =
        page.data.entity.getEntityName?.() ?? "";
      const fields = getFields(page);
      if (!fields.length) {
        if (__DEV__) console.warn("[ctl] No fields discovered.");
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
          if (__DEV__) {
            console.warn(
              "[ctl] getTranslations failed:",
              (err as Error)?.message ?? err
            );
          }
        }
      };
      window.addEventListener("click", ctl.onClick, true);

      ctl.enabled = true;
    },

    disable() {
      if (!ctl.enabled) {
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
    },
    /* eslint-disable @typescript-eslint/no-explicit-any */
    async showAllFields() {
      const X = (window as any).Xrm;
      const page = await waitFormReady(6000);
      if (!X || !page) {
        if (__DEV__) console.warn("[ctl] Form context not ready for showAllFields().");
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

  const UI_PREFIXES = ["header_process_", "header_", "process_"] as const;

  function stripAnyUiPrefix(name: string): string | null {
    for (const p of UI_PREFIXES) {
      if (name.startsWith(p)) return name.slice(p.length);
    }
    return null;
  }

  function buildNameAliases(controlName: string, attribute: string, includeProcess: boolean): string[] {
    const names = new Set<string>();
    const add = (s?: string | null) => { if (s) names.add(s); };

    add(attribute);
    add(controlName);

    add(stripAnyUiPrefix(attribute));
    add(stripAnyUiPrefix(controlName));

    // Always include header variants (common)
    if (attribute) add(`header_${attribute}`);
    if (controlName) add(`header_${controlName}`);

    // Only include process variants when needed (BPF)
    if (includeProcess) {
      if (attribute) {
        add(`process_${attribute}`);
        add(`header_process_${attribute}`);
      }
      if (controlName) {
        add(`process_${controlName}`);
        add(`header_process_${controlName}`);
      }
    }

    return [...names];
  }

  function addToIndex(
    index: LabelIndex,
    token: string,
    el: HTMLElement
  ): void {
    const key = token.toLowerCase(); // case-insensitive lookup
    const arr = index.get(key);
    if (arr) {
      arr.push(el);
    } else {
      index.set(key, [el]);
    }
  }

  function buildLabelIndex(): LabelIndex {
    const index: LabelIndex = new Map();

    // Query all labels once (narrow query for performance)
    const labels = document.querySelectorAll<HTMLElement>(
      'label[id$="-field-label"], label[data-attribute]'
    );

    for (const label of Array.from(labels)) {
      // Priority 1: data-attribute (most reliable)
      const dataAttr = label.getAttribute("data-attribute");
      if (dataAttr) {
        addToIndex(index, dataAttr, label);
      }

      // Priority 2: Extract token from label ID
      const id = label.getAttribute("id");
      if (id) {
        // Regex: /-([a-z0-9_]+)-field-label$/i
        // Matches: "...-elia_worktypecode-field-label" -> "elia_worktypecode"
        //          "...-header_process_foo-field-label" -> "header_process_foo"
        const match = id.match(/-([a-z0-9_]+)-field-label$/i);
        if (match) {
          addToIndex(index, match[1], label);
        }
      }
    }

    return index;
  }

  function getFields(page: any): Field[] {
    const out: Field[] = [];
    const attributes = page.data.entity.attributes.get?.() ?? [];
    attributes.forEach((attr: any) => {
      const attribute = attr.getName();
      attr.controls.get().forEach((ctrl: any) => {
        const controlName = ctrl.getName();
        const labelText: string = ctrl.getLabel?.() ?? "";
        out.push({
          attribute,
          controlName,
          labelText,
        });
      });
    });
    return out;
  }

  function applyLabelHighlights(fields: Field[]): void {
    // 1. Build the label index once (single DOM query)
    const labelIndex = buildLabelIndex();

    if (labelIndex.size === 0) {
      if (__DEV__) console.warn("[ctl] No labels found in index");
      return;
    }

    // 2. Global includeProcess heuristic (detect once for entire form)
    const includeProcess =
      document.querySelector('label[id*="process_"][id$="-field-label"]') != null;

    // 3. Track which labels we've already processed (dedupe by element)
    const processed = new WeakSet<HTMLElement>();

    // 4. For each field, lookup and tag all matching labels
    fields.forEach((f) => {
      // Generate aliases for this field (use GLOBAL includeProcess)
      const aliases = buildNameAliases(f.controlName, f.attribute, includeProcess);

      // Collect all candidate labels from index (map lookups, no DOM queries)
      const candidates: HTMLElement[] = [];
      for (const alias of aliases) {
        const els = labelIndex.get(alias.toLowerCase());
        if (els) {
          candidates.push(...els);
        }
      }

      // Dedupe candidates within this field (same label from multiple alias keys)
      const seenThisField = new WeakSet<HTMLElement>();
      const uniqueCandidates: HTMLElement[] = [];
      for (const el of candidates) {
        if (!seenThisField.has(el)) {
          seenThisField.add(el);
          uniqueCandidates.push(el);
        }
      }

      // Tag each validated candidate (apply to ALL: body + header + BPF)
      for (const el of uniqueCandidates) {
        // Check ownership first
        const existing = el.getAttribute("data-attribute");

        // If already tagged for THIS attribute, ensure class and skip
        if (existing === f.attribute) {
          el.classList.add("d365-translate-target");
          processed.add(el);
          continue;
        }

        // If owned by different attribute, skip
        if (existing && existing !== f.attribute) {
          continue;
        }

        // Validate: check if label ID matches any alias
        let validated = false;
        if (el.tagName.toLowerCase() === "label") {
          const id = (el.getAttribute("id") || "").toLowerCase();
          for (const alias of aliases) {
            if (id.endsWith(`-${alias.toLowerCase()}-field-label`)) {
              validated = true;
              break;
            }
          }
        }

        // Also check data-attribute exact match
        const da = (el.getAttribute("data-attribute") || "").toLowerCase();
        for (const alias of aliases) {
          if (da === alias.toLowerCase()) {
            validated = true;
            break;
          }
        }

        if (!validated) continue;

        // Tag the label
        el.classList.add("d365-translate-target");
        if (!existing) {
          el.setAttribute("data-attribute", f.attribute);
        }

        // Mark as processed
        processed.add(el);
      }

      // Optional: warn if no labels found for this field
      if (__DEV__ && candidates.length === 0) {
        console.warn("[ctl] No label candidates found for", f.controlName, f.attribute);
      }
    });
  }

  function removeExistingTooltips(): void {
    document
      .querySelectorAll(".d365-translate-tooltip")
      .forEach((n) => n.remove());
  }

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

  function lcidToName(lcid: number): string {
    return languageNames[lcid] ?? `Language ${lcid}`;
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
      if (__DEV__) console.warn("Could not resolve labelId:", err);
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
              apiVersion: getVersion(),
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
}
