/**
 * EntityFormSelector - Entity and form dropdown selectors
 */

import { Combobox, Dropdown, makeStyles, Option, OptionGroup, shorthands, Spinner, tokens } from '@fluentui/react-components';
import type { EntitySummary } from '../../services/entityMetadataService';
import { getEntityDisplayName } from '../../services/entityMetadataService';
import type { SystemForm } from '../../services/d365Api';
import { getFormTypeLabel } from '../../utils/formTypeUtils';
import { ErrorBox } from '../ui/Notice';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(spacing.sm),
  },
  spinnerContainer: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  dropdownListbox: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `2px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow16,
  },
});

export interface EntityFormSelectorProps {
  // Entity selection
  availableEntities: EntitySummary[];
  loadingEntities: boolean;
  entitiesError: string | null;
  selectedEntity: string | null;
  entityDropdownValue: string;
  onEntityChange: (_: unknown, data: { optionValue?: unknown }) => void;
  onEntityDropdownValueChange: (value: string) => void;

  // Form selection
  availableForms: SystemForm[];
  loadingForms: boolean;
  formsError: string | null;
  selectedFormId: string | null;
  groupedForms: Array<[number, SystemForm[]]>;
  onFormChange: (_: unknown, data: { optionValue?: unknown }) => void;
}

export default function EntityFormSelector({
  availableEntities,
  loadingEntities,
  entitiesError,
  selectedEntity,
  entityDropdownValue,
  onEntityChange,
  onEntityDropdownValueChange,
  availableForms,
  loadingForms,
  formsError,
  selectedFormId,
  groupedForms,
  onFormChange,
}: EntityFormSelectorProps): JSX.Element {
  const styles = useStyles();

  const filteredEntities = entityDropdownValue.trim()
    ? availableEntities.filter(e => {
        const displayName = getEntityDisplayName(e).toLowerCase();
        const logicalName = e.LogicalName.toLowerCase();
        const query = entityDropdownValue.toLowerCase();
        return displayName.includes(query) || logicalName.includes(query);
      })
    : availableEntities;

  return (
    <div className={styles.container}>
      {/* Entity Dropdown */}
      {loadingEntities ? (
        <div className={styles.spinnerContainer}>
          <Spinner size='small' label='Loading entities...' />
        </div>
      ) : entitiesError ? (
        <ErrorBox>{entitiesError}</ErrorBox>
      ) : availableEntities.length > 0 ? (
        <Combobox
          placeholder='Search or select an entity...'
          value={
            entityDropdownValue ||
            (availableEntities.find(e => e.LogicalName === selectedEntity)
              ? getEntityDisplayName(availableEntities.find(e => e.LogicalName === selectedEntity)!)
              : '')
          }
          selectedOptions={selectedEntity ? [selectedEntity] : []}
          onOptionSelect={onEntityChange}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => onEntityDropdownValueChange(e.target.value)}
          positioning='below-start'
          listbox={{ className: styles.dropdownListbox }}
          style={{ width: '100%' }}
        >
          {filteredEntities.length > 0 ? (
            filteredEntities.map(e => (
              <Option key={e.LogicalName} value={e.LogicalName} text={getEntityDisplayName(e)}>
                {getEntityDisplayName(e)}
              </Option>
            ))
          ) : (
            <Option disabled value=''>
              No entities found
            </Option>
          )}
        </Combobox>
      ) : null}

      {/* Form Dropdown */}
      {selectedEntity && (
        <>
          {loadingForms ? (
            <div className={styles.spinnerContainer}>
              <Spinner size='small' label='Loading forms...' />
            </div>
          ) : formsError ? (
            <ErrorBox>{formsError}</ErrorBox>
          ) : availableForms.length > 0 ? (
            <Dropdown
              placeholder='Select a form'
              value={availableForms.find(f => f.formid === selectedFormId)?.name || 'Select a form'}
              selectedOptions={selectedFormId ? [selectedFormId] : []}
              onOptionSelect={onFormChange}
              positioning={{ position: 'below', align: 'start', flipBoundary: null }}
              listbox={{ className: styles.dropdownListbox }}
              style={{ width: '100%' }}
            >
              {groupedForms.map(([type, forms]) => (
                <OptionGroup key={type} label={getFormTypeLabel(type)}>
                  {forms.map(form => (
                    <Option key={form.formid} value={form.formid} text={form.name}>
                      {form.name}
                    </Option>
                  ))}
                </OptionGroup>
              ))}
            </Dropdown>
          ) : null}
        </>
      )}
    </div>
  );
}
