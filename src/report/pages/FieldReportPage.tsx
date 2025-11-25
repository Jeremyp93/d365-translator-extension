// src/pages/FieldReportPage.tsx
import { useEffect } from "react";
import {
  Title3,
  Text,
  Card,
  CardHeader,
  Divider,
  makeStyles,
} from "@fluentui/react-components";

import { ErrorBox } from "../../components/ui/Notice";
import EntityLabelEditor from "../../components/EntityLabelEditor";
import FormLabelEditor from "../../components/FormLabelEditor";

// Hook that provides context from the URL (clientUrl, entity, attribute, formId, labelId, etc.)
import { useOrgContext } from "../../hooks/useOrgContext";

const useStyles = makeStyles({
  page: {
    padding: "16px",
    maxWidth: "1100px",
    margin: "0 auto",
    display: "grid",
    rowGap: "16px",
  },
  metaCard: {
    padding: "12px",
    backgroundColor: "var(--colorNeutralBackgroundStatic)",
  },
  metaRow: {
    color: "#6a737d",
    fontSize: "12px",
    lineHeight: "18px",
  },
});

export default function FieldReportPage(): JSX.Element {
  const styles = useStyles();

  const { clientUrl, entity, attribute, formId, labelId } = useOrgContext();

  // Set document title
  useEffect(() => {
    document.title = 'Field Labels - D365 Translator';
  }, []);

  // Simple inline validation
  const problems: string[] = [];
  if (!clientUrl) problems.push("Missing clientUrl in query.");
  if (!entity) problems.push("Missing entity in query.");
  if (!attribute) problems.push("Missing attribute in query.");

  const canEditEntityLabels = !!clientUrl && !!entity && !!attribute;
  const canEditFormLabels = canEditEntityLabels; // page renders component; the component itself will handle formId/labelId

  return (
    <div className={styles.page}>
      <Title3>Field Translations</Title3>

      <Card className={styles.metaCard}>
        <CardHeader
          header={<Text weight="semibold">Context</Text>}
          description={
            <div>
              <div className={styles.metaRow}>
                Client URL: <code>{clientUrl || "(none)"}</code>
              </div>
              <div className={styles.metaRow}>
                Entity: <code>{entity || "(none)"}</code> • Attribute:{" "}
                <code>{attribute || "(none)"}</code>
              </div>
              <div className={styles.metaRow}>
                FormId: <code>{formId || "(none)"}</code> • LabelId:{" "}
                <code>{labelId || "(none)"}</code>
              </div>
            </div>
          }
        />
        <Divider />
        {problems.length > 0 && <ErrorBox>{problems.join(" ")}</ErrorBox>}
      </Card>

      {/* Entity DisplayName editor */}
      {canEditEntityLabels && (
        <EntityLabelEditor
          clientUrl={clientUrl!}
          entity={entity!}
          attribute={attribute!}
        />
      )}

      {/* Form control label editor (optional — enabled when formId & labelId are present) */}
      {canEditFormLabels && (
        <FormLabelEditor
          clientUrl={clientUrl!}
          entity={entity!}
          attribute={attribute!}
          formId={(formId || "").replace(/[{}]/g, "").toLowerCase()}
          labelId={(labelId || "").replace(/[{}]/g, "").toLowerCase()}
        />
      )}
    </div>
  );
}
