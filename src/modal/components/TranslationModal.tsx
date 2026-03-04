import { useState, useEffect } from "react";
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
import { useTranslationModalData } from "../../hooks/useTranslationModalData";
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

  const hasFormTab = Boolean(formId && labelId);
  const isDisabled = isEditingBlocked || permissionLoading;

  // Data orchestration hook
  const modalData = useTranslationModalData({
    clientUrl,
    entity,
    attribute,
    formId,
    labelId,
    apiVersion,
    langs,
    activeTab,
    optionSet,
  });

  // Load optionset data when switching to optionset tab
  useEffect(() => {
    if (activeTab === "optionset" && hasOptionSetTab && !optionSet.loaded) {
      optionSet.load();
    }
  }, [activeTab, hasOptionSetTab, optionSet.loaded, optionSet.load]);

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
          entityLoading={modalData.entityLoading}
          entityError={modalData.entityError}
          entityValues={modalData.entityValues}
          entityOriginalValues={modalData.entityOriginalValues}
          isDisabled={isDisabled}
          onValueChange={modalData.handleEntityValueChange}
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
        formLoading={modalData.formLoading}
        formError={modalData.formError}
        formLoaded={modalData.formLoaded}
        formValues={modalData.formValues}
        formOriginalValues={modalData.formOriginalValues}
        isDisabled={isDisabled}
        onValueChange={modalData.handleFormValueChange}
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

        {modalData.saveError && (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{modalData.saveError}</MessageBarBody>
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
              ? modalData.entityChanges.length
              : activeTab === "form"
                ? modalData.formChanges.length
                : optionSet.changes.length
          }
          saving={modalData.saving}
          onSave={modalData.handleSave}
          onDiscard={modalData.handleDiscard}
        />
      </DialogSurface>
    </Dialog>
  );
}
