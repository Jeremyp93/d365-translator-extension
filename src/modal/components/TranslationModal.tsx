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
  Badge,
} from "@fluentui/react-components";
import { Database24Regular, Form24Regular, Options24Regular } from "@fluentui/react-icons";
import { useLanguages } from "../../hooks/useLanguages";
import { useEditingPermission } from "../../hooks/useEditingPermission";
import { useAttributeType } from "../../hooks/useAttributeType";
import { isOptionSetType } from "../../services/optionSetService";
import { useOptionSetTranslations } from "../../hooks/useOptionSetTranslations";
import {
  getAttributeLabelTranslations,
  updateAttributeLabelsViaWebApi,
} from "../../services/entityLabelService";
import {
  readFormFieldLabelsAllLcids,
  saveFormFieldLabelsAllLcids,
} from "../../services/formLabelService";
import { publishEntityViaWebApi } from "../../services/d365Api";
import { TranslationModalHeader } from "./TranslationModalHeader";
import { TranslationModalFooter } from "./TranslationModalFooter";
import { EntityTabContent } from "./EntityTabContent";
import { FormTabContent } from "./FormTabContent";
import { OptionSetTabContent } from "./OptionSetTabContent";
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

type TabValue = "entity" | "form" | "optionset";

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

  // Attribute type detection
  const { attributeType } = useAttributeType(clientUrl, entity, attribute, apiVersion);
  const hasOptionSetTab = isOptionSetType(attributeType);

  // OptionSet translations
  const optionSet = useOptionSetTranslations(clientUrl, entity, attribute, langs ?? undefined, apiVersion);

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
      } catch (e: unknown) {
        if (!cancelled) {
          setEntityError(e instanceof Error ? e.message : String(e));
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
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : String(e));
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

  // Load optionset data when switching to optionset tab
  useEffect(() => {
    if (activeTab === "optionset" && hasOptionSetTab && !optionSet.loaded) {
      optionSet.load();
    }
  }, [activeTab, hasOptionSetTab, optionSet.loaded, optionSet.load]);

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

  const totalChangeCount = entityChanges.length + formChanges.length + optionSet.changes.length;

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
    } else if (activeTab === "form") {
      setFormValues({ ...formOriginalValues });
    } else if (activeTab === "optionset") {
      optionSet.discard();
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

      // Save optionset changes if on optionset tab and has changes
      if (activeTab === "optionset" && optionSet.changes.length > 0) {
        await optionSet.save();
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // Render tab content
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
      return (
        <EntityTabContent
          langs={langs}
          baseLcid={baseLcid}
          entityLoading={entityLoading}
          entityError={entityError}
          entityValues={entityValues}
          entityOriginalValues={entityOriginalValues}
          isDisabled={isDisabled}
          onValueChange={handleEntityValueChange}
        />
      );
    }

    if (activeTab === "optionset") {
      return (
        <OptionSetTabContent
          langs={langs}
          baseLcid={baseLcid}
          isDisabled={isDisabled}
          loading={optionSet.loading}
          error={optionSet.error}
          loaded={optionSet.loaded}
          metadata={optionSet.metadata}
          values={optionSet.values}
          originalValues={optionSet.originalValues}
          onChange={optionSet.onChange}
        />
      );
    }

    return (
      <FormTabContent
        langs={langs}
        baseLcid={baseLcid}
        formLoading={formLoading}
        formError={formError}
        formLoaded={formLoaded}
        formValues={formValues}
        formOriginalValues={formOriginalValues}
        isDisabled={isDisabled}
        onValueChange={handleFormValueChange}
      />
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
            {hasOptionSetTab && (
              <Tab value="optionset" icon={<Options24Regular />}>
                OptionSet Values
                {optionSet.metadata?.isGlobal && (
                  <>
                    {" "}
                    <Badge color="informative" appearance="filled" size="small">
                      Global
                    </Badge>
                  </>
                )}
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

        {optionSet.saveError && (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{optionSet.saveError}</MessageBarBody>
            </MessageBar>
          </div>
        )}

        <TranslationModalFooter
          changeCount={
            activeTab === "entity"
              ? entityChanges.length
              : activeTab === "form"
                ? formChanges.length
                : optionSet.changes.length
          }
          saving={saving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      </DialogSurface>
    </Dialog>
  );
}
