import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogSurface,
  TabList,
  Tab,
  Spinner,
  MessageBar,
  MessageBarBody,
  Text,
} from "@fluentui/react-components";
import { Database24Regular, Form24Regular } from "@fluentui/react-icons";
import { useLanguages } from "../../hooks/useLanguages";
import { useEditingPermission } from "../../hooks/useEditingPermission";
import {
  getAttributeLabelTranslations,
  updateAttributeLabelsViaWebApi,
  type Label,
} from "../../services/entityLabelService";
import {
  readFormFieldLabelsAllLcids,
  saveFormFieldLabelsAllLcids,
} from "../../services/formLabelService";
import { publishEntityViaWebApi } from "../../services/d365Api";
import { TranslationModalHeader } from "./TranslationModalHeader";
import { TranslationModalFooter } from "./TranslationModalFooter";
import { LanguageCard } from "./LanguageCard";
import { useTranslationModalStyles } from "./translationModalStyles";

export interface TranslationModalProps {
  open: boolean;
  onClose: () => void;
  clientUrl: string;
  entity: string;
  attribute: string;
  formId?: string;
  labelId?: string;
  apiVersion?: string;
  onOpenNewTab?: () => void;
}

type TabValue = "entity" | "form";

export function TranslationModal({
  open,
  onClose,
  clientUrl,
  entity,
  attribute,
  formId,
  labelId,
  apiVersion = "v9.2",
  onOpenNewTab,
}: TranslationModalProps) {
  const styles = useTranslationModalStyles();
  const [activeTab, setActiveTab] = useState<TabValue>("entity");

  // Language data
  const { langs, baseLcid, error: langsError } = useLanguages(clientUrl, apiVersion);
  const { isEditingBlocked, loading: permissionLoading } = useEditingPermission(clientUrl, apiVersion);

  // Entity translations
  const [entityValues, setEntityValues] = useState<Record<number, string>>({});
  const [entityOriginalValues, setEntityOriginalValues] = useState<Record<number, string>>({});
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);

  // Form translations
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [formOriginalValues, setFormOriginalValues] = useState<Record<number, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoaded, setFormLoaded] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasFormTab = Boolean(formId && labelId);
  const isDisabled = isEditingBlocked || permissionLoading;

  // Load entity labels on mount
  useEffect(() => {
    if (!clientUrl || !entity || !attribute || !langs || langs.length === 0) {
      return;
    }

    let cancelled = false;
    setEntityLoading(true);
    setEntityError(null);

    (async () => {
      try {
        const labels = await getAttributeLabelTranslations(clientUrl, entity, attribute);
        if (cancelled) return;

        // Convert to Record<lcid, value>
        const valuesMap: Record<number, string> = {};
        labels.forEach((l) => {
          valuesMap[l.languageCode] = l.label;
        });

        // Fill in missing languages with empty strings
        langs.forEach((lcid) => {
          if (!(lcid in valuesMap)) {
            valuesMap[lcid] = "";
          }
        });

        setEntityValues(valuesMap);
        setEntityOriginalValues({ ...valuesMap });
      } catch (e: any) {
        if (!cancelled) {
          setEntityError(e?.message ?? String(e));
        }
      } finally {
        if (!cancelled) {
          setEntityLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientUrl, entity, attribute, langs]);

  // Load form labels when tab is clicked
  const loadFormLabels = useCallback(async () => {
    if (!clientUrl || !formId || !labelId || !langs || langs.length === 0 || formLoaded) {
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const labelsArray = await readFormFieldLabelsAllLcids(
        clientUrl,
        formId,
        attribute,
        labelId,
        langs
      );

      const valuesMap: Record<number, string> = {};
      labelsArray.forEach((item) => {
        valuesMap[item.lcid] = item.label;
      });

      // Fill in missing languages
      langs.forEach((lcid) => {
        if (!(lcid in valuesMap)) {
          valuesMap[lcid] = "";
        }
      });

      setFormValues(valuesMap);
      setFormOriginalValues({ ...valuesMap });
      setFormLoaded(true);
    } catch (e: any) {
      setFormError(e?.message ?? String(e));
    } finally {
      setFormLoading(false);
    }
  }, [clientUrl, formId, labelId, attribute, langs, formLoaded]);

  // Load form labels when switching to form tab
  useEffect(() => {
    if (activeTab === "form" && hasFormTab && !formLoaded) {
      loadFormLabels();
    }
  }, [activeTab, hasFormTab, formLoaded, loadFormLabels]);

  // Change detection
  const entityChanges = useMemo(() => {
    return Object.entries(entityValues).filter(
      ([lcid, val]) => val !== entityOriginalValues[Number(lcid)]
    );
  }, [entityValues, entityOriginalValues]);

  const formChanges = useMemo(() => {
    return Object.entries(formValues).filter(
      ([lcid, val]) => val !== formOriginalValues[Number(lcid)]
    );
  }, [formValues, formOriginalValues]);

  const totalChangeCount = entityChanges.length + formChanges.length;

  // Handlers
  const handleEntityValueChange = (lcid: number, value: string) => {
    setEntityValues((prev) => ({ ...prev, [lcid]: value }));
  };

  const handleFormValueChange = (lcid: number, value: string) => {
    setFormValues((prev) => ({ ...prev, [lcid]: value }));
  };

  const handleDiscard = () => {
    if (activeTab === "entity") {
      setEntityValues({ ...entityOriginalValues });
    } else {
      setFormValues({ ...formOriginalValues });
    }
    setSaveError(null);
  };

  const handleSave = async () => {
    if (totalChangeCount === 0) return;

    setSaving(true);
    setSaveError(null);

    try {
      // Save entity changes if on entity tab and has changes
      if (activeTab === "entity" && entityChanges.length > 0) {
        const labels: { LanguageCode: number; Label: string }[] = Object.entries(entityValues).map(
          ([lcid, label]) => ({
            LanguageCode: Number(lcid),
            Label: label,
          })
        );

        await updateAttributeLabelsViaWebApi(clientUrl, entity, attribute, labels);
        await publishEntityViaWebApi(clientUrl, entity);

        // Update original values
        setEntityOriginalValues({ ...entityValues });
      }

      // Save form changes if on form tab and has changes
      if (activeTab === "form" && formChanges.length > 0 && formId && labelId) {
        await saveFormFieldLabelsAllLcids(clientUrl, formId, attribute, labelId, formValues);
        await publishEntityViaWebApi(clientUrl, entity);

        // Update original values
        setFormOriginalValues({ ...formValues });
      }
    } catch (e: any) {
      setSaveError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  // Render helpers
  const renderContent = () => {
    if (!langs || langs.length === 0) {
      return (
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <Text>Loading languages...</Text>
        </div>
      );
    }

    if (activeTab === "entity") {
      if (entityLoading) {
        return (
          <div className={styles.loadingContainer}>
            <Spinner size="large" />
            <Text>Loading entity labels...</Text>
          </div>
        );
      }

      if (entityError) {
        return (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{entityError}</MessageBarBody>
            </MessageBar>
          </div>
        );
      }

      return (
        <div className={styles.cardsContainer}>
          {langs.map((lcid) => (
            <LanguageCard
              key={lcid}
              lcid={lcid}
              value={entityValues[lcid] || ""}
              originalValue={entityOriginalValues[lcid] || ""}
              isBase={lcid === baseLcid}
              disabled={isDisabled}
              onChange={(value) => handleEntityValueChange(lcid, value)}
            />
          ))}
        </div>
      );
    }

    // Form tab
    if (formLoading) {
      return (
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <Text>Loading form labels...</Text>
        </div>
      );
    }

    if (formError) {
      return (
        <div className={styles.errorContainer}>
          <MessageBar intent="error">
            <MessageBarBody>{formError}</MessageBarBody>
          </MessageBar>
        </div>
      );
    }

    if (!formLoaded) {
      return (
        <div className={styles.emptyState}>
          <Text>Click the Form Labels tab to load form translations</Text>
        </div>
      );
    }

    return (
      <div className={styles.cardsContainer}>
        {langs.map((lcid) => (
          <LanguageCard
            key={lcid}
            lcid={lcid}
            value={formValues[lcid] || ""}
            originalValue={formOriginalValues[lcid] || ""}
            isBase={lcid === baseLcid}
            disabled={isDisabled}
            onChange={(value) => handleFormValueChange(lcid, value)}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} modalType="modal">
      <DialogSurface className={styles.modalSurface}>
        <TranslationModalHeader
          attribute={attribute}
          entity={entity}
          onClose={onClose}
          onOpenNewTab={onOpenNewTab}
        />

        {isEditingBlocked && (
          <div className={styles.errorContainer}>
            <MessageBar intent="warning">
              <MessageBarBody>
                You don't have permission to edit translations. Contact your administrator.
              </MessageBarBody>
            </MessageBar>
          </div>
        )}

        {langsError && (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{langsError}</MessageBarBody>
            </MessageBar>
          </div>
        )}

        <div className={styles.tabBar}>
          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as TabValue)}
          >
            <Tab value="entity" icon={<Database24Regular />}>
              Entity Labels
            </Tab>
            {hasFormTab && (
              <Tab value="form" icon={<Form24Regular />}>
                Form Labels
              </Tab>
            )}
          </TabList>
        </div>

        <div className={styles.content}>{renderContent()}</div>

        {saveError && (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{saveError}</MessageBarBody>
            </MessageBar>
          </div>
        )}

        <TranslationModalFooter
          changeCount={activeTab === "entity" ? entityChanges.length : formChanges.length}
          saving={saving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      </DialogSurface>
    </Dialog>
  );
}
