// Build-time constant injected by Vite
declare const __DEV__: boolean;

// Minimal typing for messages shared via window.postMessage
export type BridgeCommand =
  | { type: "BRIDGE_INIT" }
  | { type: "FIND_FIELDS" }
  | {
      type: "GET_TRANSLATIONS";
      entityLogicalName: string;
      attributeLogicalName: string;
    };

export type BridgeResponse =
  | {
      type: "FIELDS_FOUND";
      fields: {
        attribute: string;
        controlName: string;
        domSelector: string;
      }[];
    }
  | {
      type: "TRANSLATIONS";
      attribute: string;
      labels: { languageCode: number; label: string }[];
    }
  | { type: "ERROR"; message: string };
