/**
 * FieldInfoModal - Standalone modal component for field translations
 * Modern UI with Fluent Dialog, brand-tinted header, collapsible sections, and auto-loading
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  makeStyles,
  tokens,
  Button,
  Text,
  CounterBadge,
  Divider,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Caption1,
} from "@fluentui/react-components";
import {
  Dismiss20Regular,
  Open20Regular,
  TextFieldRegular,
} from "@fluentui/react-icons";

import { ErrorBox } from "./ui/Notice";
import EntityLabelEditorV2 from "./EntityLabelEditorV2";
import FormLabelEditorV2 from "./FormLabelEditorV2";
import OptionSetEditorV2 from "./OptionSetEditorV2";
import { EditingBlockedBanner } from "./ui/EditingBlockedBanner";
import { useAttributeType } from "../hooks/useAttributeType";
import { useEditingPermission } from "../hooks/useEditingPermission";
import { usePendingChanges } from "../hooks/usePendingChanges";
import { spacing, animations } from "../styles/theme";
import { isOptionSetType } from "../services/optionSetService";
import { normalizeGuid } from "../utils/stringHelpers";

const useStyles = makeStyles({
  dialogSurface: {
    maxWidth: "900px",
    width: "95vw",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    padding: 0,
    overflow: "hidden",
    "@media (max-width: 768px)": {
      width: "95vw",
      maxHeight: "90vh",
    },
    "@media (max-width: 480px)": {
      width: "100vw",
      height: "100dvh",
      maxWidth: "100vw",
      maxHeight: "100dvh",
      borderRadius: 0,
    },
  },
  header: {
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground2}, ${tokens.colorNeutralBackground2})`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: spacing.lg,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    minWidth: 0,
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  subtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerActions: {
    display: "flex",
    gap: spacing.xs,
    alignItems: "center",
    flexShrink: 0,
  },
  dialogBody: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    // Styled scrollbar
    "::-webkit-scrollbar": {
      width: "8px",
    },
    "::-webkit-scrollbar-track": {
      background: tokens.colorNeutralBackground1,
    },
    "::-webkit-scrollbar-thumb": {
      background: tokens.colorNeutralStroke1,
      borderRadius: tokens.borderRadiusMedium,
      ":hover": {
        background: tokens.colorNeutralStroke2,
      },
    },
  },
  content: {
    padding: spacing.lg,
    display: "flex",
    flexDirection: "column",
    gap: spacing.xl,
    ...animations.fadeIn,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    paddingLeft: spacing.xs,
  },
  divider: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  accordion: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  accordionHeader: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  accordionPanel: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});

export interface FieldInfoModalProps {
  /** Modal visibility */
  open: boolean;
  /** Close callback */
  onClose: () => void;
  /** D365 organization URL */
  clientUrl: string;
  /** Entity logical name */
  entity: string;
  /** Attribute logical name */
  attribute: string;
  /** Form ID (normalized GUID) */
  formId?: string;
  /** Label ID (normalized GUID) */
  labelId?: string;
  /** Attribute type (e.g., 'Picklist', 'String') */
  attributeType?: string;
  /** API version */
  apiVersion?: string;
  /** Optional callback for "Open in new tab" action */
  onOpenNewTab?: () => void;
}

interface FieldModalValidation {
  problems: string[];
  canEdit: boolean;
}

/**
 * Validates required parameters for field modal functionality
 */
function validateFieldModalParams(
  clientUrl: string | undefined,
  entity: string | undefined,
  attribute: string | undefined
): FieldModalValidation {
  const problems: string[] = [];

  if (!clientUrl) problems.push("Missing clientUrl.");
  if (!entity) problems.push("Missing entity.");
  if (!attribute) problems.push("Missing attribute.");

  return {
    problems,
    canEdit: problems.length === 0,
  };
}

export default function FieldInfoModal({
  open,
  onClose,
  clientUrl,
  entity,
  attribute,
  formId,
  labelId,
  attributeType,
  apiVersion = "v9.2",
  onOpenNewTab,
}: FieldInfoModalProps): JSX.Element {
  const styles = useStyles();
  const { count: pendingCount } = usePendingChanges();
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Form translation state (lifted to persist across accordion toggle)
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [hasLoadedFormTable, setHasLoadedFormTable] = useState(false);

  // Check editing permission
  const { isEditingBlocked, loading: permissionLoading } = useEditingPermission(
    clientUrl,
    apiVersion
  );

  // Detect attribute type for conditional OptionSet editor
  const { attributeType: detectedType } = useAttributeType(
    clientUrl,
    entity,
    attribute,
    apiVersion
  );
  const effectiveAttributeType = attributeType || detectedType;

  // Validate required parameters
  const validation = validateFieldModalParams(clientUrl, entity, attribute);

  // Handle close with pending changes confirmation
  const handleClose = () => {
    if (pendingCount > 0) {
      const confirmClose = window.confirm(
        `You have ${pendingCount} unsaved change${
          pendingCount > 1 ? "s" : ""
        }. Close anyway?`
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  // Prevent closing on dialog change when there are pending changes
  const handleOpenChange = (_: unknown, data: { open: boolean }) => {
    if (!data.open) {
      handleClose();
    }
  };

  // Early validation error state
  if (!validation.canEdit) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange} modalType="non-modal">
        <DialogSurface className={styles.dialogSurface}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <TextFieldRegular className={styles.headerIcon} />
              <div className={styles.headerText}>
                <Text className={styles.title}>Field Translations</Text>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular />}
                onClick={handleClose}
                title="Close"
                size="small"
              />
            </div>
          </div>
          <DialogBody className={styles.dialogBody}>
            <div className={styles.content}>
              <ErrorBox>{validation.problems.join(" ")}</ErrorBox>
            </div>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  }

  const normalizedFormId = formId ? normalizeGuid(formId) : undefined;
  const normalizedLabelId = labelId ? normalizeGuid(labelId) : undefined;
  const showOptionSet =
    effectiveAttributeType && isOptionSetType(effectiveAttributeType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modalType="non-modal">
      <DialogSurface className={styles.dialogSurface}>
        {/* Brand-tinted Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <TextFieldRegular className={styles.headerIcon} fontSize={24} />
            <div className={styles.headerText}>
              <Text className={styles.title}>{attribute}</Text>
              <Caption1 className={styles.subtitle}>{entity}</Caption1>
            </div>
          </div>
          <div className={styles.headerActions}>
            {pendingCount > 0 && (
              <CounterBadge
                count={pendingCount}
                appearance="filled"
                color="important"
                size="small"
              />
            )}
            {onOpenNewTab && (
              <Button
                appearance="subtle"
                icon={<Open20Regular />}
                onClick={onOpenNewTab}
                title="Open in new tab"
                size="small"
              />
            )}
            <Button
              appearance="subtle"
              icon={<Dismiss20Regular />}
              onClick={handleClose}
              title="Close"
              size="small"
            />
          </div>
        </div>

        {/* Content */}
        <DialogBody className={styles.dialogBody}>
          <div className={styles.content}>
            {/* Editing blocked warning banner */}
            <EditingBlockedBanner visible={isEditingBlocked} />

            {/* Entity Field Labels - Always Visible */}
            <EntityLabelEditorV2
              clientUrl={clientUrl}
              entity={entity}
              attribute={attribute}
              readOnly={isEditingBlocked || permissionLoading}
            />

            {/* Form Control Labels - Always Visible */}
            {normalizedFormId && normalizedLabelId && (
              <>
                <Divider className={styles.divider} />
                <div className={styles.section}>
                  <Caption1 className={styles.sectionLabel}>
                    Form Control Labels
                  </Caption1>
                  <FormLabelEditorV2
                    clientUrl={clientUrl}
                    entity={entity}
                    attribute={attribute}
                    formId={normalizedFormId}
                    labelId={normalizedLabelId}
                    readOnly={isEditingBlocked || permissionLoading}
                    autoLoad={true}
                    formValues={formValues}
                    setFormValues={setFormValues}
                    hasLoadedTable={hasLoadedFormTable}
                    setHasLoadedTable={setHasLoadedFormTable}
                  />
                </div>
              </>
            )}

            {/* Collapsible OptionSet Section */}
            {showOptionSet && (
              <Accordion
                collapsible
                multiple
                openItems={openItems}
                onToggle={(_, data) => setOpenItems(data.openItems as string[])}
                className={styles.accordion}
              >
                <AccordionItem value="optionset">
                  <AccordionHeader className={styles.accordionHeader}>
                    OptionSet Translations
                  </AccordionHeader>
                  <AccordionPanel className={styles.accordionPanel}>
                    <OptionSetEditorV2
                      clientUrl={clientUrl}
                      entity={entity}
                      attribute={attribute}
                      apiVersion={apiVersion}
                      readOnly={isEditingBlocked || permissionLoading}
                    />
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
