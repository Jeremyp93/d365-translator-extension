# Spec: Entity Attribute Translation (Bulk Editing)

**Capability:** entity-attribute-translation
**Type:** New Capability
**Status:** Proposed
**Change ID:** add-bulk-translation-editing

## Overview

This capability enables bulk translation editing for entity attributes in Dynamics 365. Users can accumulate translation changes across multiple attributes and entities, review all pending changes together, and save them in a single batch operation.

This replaces the immediate-save workflow with a deferred-commit shopping-cart-style workflow, improving efficiency for administrators translating many attributes.

## ADDED Requirements

### Requirement: Pending Changes Accumulation

The system SHALL accumulate translation changes locally without immediately saving to Dynamics 365.

#### Scenario: Single attribute edit
- **WHEN** user edits a translation value for an attribute
- **THEN** the change is stored in local pending changes state
- **AND** no API call is made to Dynamics 365
- **AND** the change can be retrieved for review later

#### Scenario: Multiple edits to same attribute language
- **WHEN** user edits French translation for "accountnumber" to "Numéro"
- **AND** later edits French translation for "accountnumber" to "Numéro de compte"
- **THEN** only the latest value "Numéro de compte" is stored in pending changes
- **AND** the older value is overwritten

#### Scenario: Edits across multiple entities
- **WHEN** user edits translations on "Account" entity attributes
- **AND** switches to "Contact" entity
- **AND** edits translations on "Contact" entity attributes
- **THEN** all changes from both entities are preserved in pending changes state

### Requirement: Pending Changes Cart Button

The system SHALL display a cart button showing the count of pending translation changes.

#### Scenario: No pending changes
- **WHEN** no translation changes have been made
- **THEN** cart button displays without a badge
- **AND** cart button is disabled or shows "0" badge

#### Scenario: Pending changes exist
- **WHEN** user has 5 pending translation changes
- **THEN** cart button displays with badge showing "5"
- **AND** cart button is enabled and clickable

#### Scenario: Badge updates dynamically
- **WHEN** user adds a translation change
- **THEN** badge count increments immediately
- **WHEN** user saves all changes successfully
- **THEN** badge count resets to 0

### Requirement: Pending Changes Review Modal

The system SHALL provide a modal dialog for reviewing all pending translation changes before saving.

#### Scenario: Open review modal
- **WHEN** user clicks the cart button
- **THEN** modal dialog opens displaying all pending changes
- **AND** changes are grouped by entity
- **AND** each change shows entity name, attribute name, language, old value, and new value

#### Scenario: Empty cart modal
- **WHEN** user opens modal with no pending changes
- **THEN** modal displays "No pending changes" message
- **AND** "Save All" button is disabled

#### Scenario: Modal displays old vs new values
- **WHEN** modal is open with pending changes
- **THEN** each change displays in format: "Language (LCID): 'old value' → 'new value'"
- **AND** empty old values display as "" or "(empty)"

#### Scenario: Remove individual change
- **WHEN** user clicks remove button next to a pending change
- **THEN** that change is removed from pending changes
- **AND** cart badge count decrements
- **AND** modal updates to reflect removal

#### Scenario: Clear all changes
- **WHEN** user clicks "Clear All" button in modal
- **THEN** confirmation dialog is shown
- **WHEN** user confirms
- **THEN** all pending changes are removed
- **AND** cart badge resets to 0
- **AND** modal closes

### Requirement: Batch Save Operation

The system SHALL save all pending translation changes in a single batch operation.

#### Scenario: Successful batch save
- **WHEN** user clicks "Save All" in review modal
- **THEN** system sends batch request to update all attributes
- **AND** loading indicator is displayed
- **WHEN** all updates succeed
- **THEN** success notification is shown with count (e.g., "17 attributes updated successfully")
- **AND** all affected entities are published once
- **AND** pending changes are cleared
- **AND** modal closes

#### Scenario: Partial failure in batch save
- **WHEN** user saves 10 pending changes
- **AND** 7 updates succeed
- **AND** 3 updates fail
- **THEN** success notification shows "7 attributes saved, 3 failed"
- **AND** successful changes are removed from pending changes
- **AND** failed changes remain in pending changes with error details
- **AND** modal remains open showing only failed items

#### Scenario: Complete failure in batch save
- **WHEN** user saves pending changes
- **AND** all updates fail due to network error
- **THEN** error notification is displayed
- **AND** all pending changes remain in cart
- **AND** user can retry

#### Scenario: Retry failed items
- **WHEN** partial failure has occurred
- **AND** modal shows only failed changes
- **WHEN** user clicks "Save All" again
- **THEN** only the remaining failed changes are retried
- **AND** same success/failure handling applies

### Requirement: Entity Publishing Optimization

The system SHALL publish each affected entity only once after all attribute updates succeed.

#### Scenario: Multiple attributes on same entity
- **WHEN** user saves changes to 5 attributes on "Account" entity
- **THEN** "Account" entity is published only once
- **AND** publish happens after all 5 attribute updates complete

#### Scenario: Attributes across multiple entities
- **WHEN** user saves changes to attributes on "Account", "Contact", and "Lead" entities
- **THEN** each entity is published exactly once
- **AND** publishes happen in parallel for performance

### Requirement: Unsaved Changes Warning

The system SHALL warn users before losing pending changes when navigating away.

#### Scenario: Close browser tab with pending changes
- **WHEN** user has pending changes
- **AND** attempts to close browser tab
- **THEN** browser shows "You have unsaved changes" confirmation dialog

#### Scenario: Refresh page with pending changes
- **WHEN** user has pending changes
- **AND** attempts to refresh page
- **THEN** browser shows "You have unsaved changes" confirmation dialog

#### Scenario: Navigate away without pending changes
- **WHEN** user has no pending changes
- **AND** attempts to close tab or navigate away
- **THEN** no warning is shown

#### Scenario: Entity switching preserves changes
- **WHEN** user has pending changes on "Account" attributes
- **AND** switches to "Contact" entity in the entity browser
- **THEN** all pending changes are preserved
- **AND** user can continue editing "Contact" attributes
- **AND** cart badge still shows total count

### Requirement: Pending Changes Data Integrity

The system SHALL maintain accurate pending changes state throughout the user session.

#### Scenario: Duplicate detection
- **WHEN** user edits accountnumber French translation to "A"
- **AND** later edits accountnumber French translation to "B"
- **THEN** only one pending change exists for accountnumber French
- **AND** the value is "B" (latest edit wins)

#### Scenario: Unique key per entity-attribute-language
- **WHEN** user edits accountnumber French translation
- **AND** edits accountnumber Spanish translation
- **AND** edits accountname French translation
- **THEN** three separate pending changes exist
- **AND** each is uniquely identified by entity + attribute + language code

### Requirement: Batch Request Size Limits

The system SHALL handle large numbers of pending changes by splitting into multiple batches if needed.

#### Scenario: Large change set batching
- **WHEN** user has 150 pending changes
- **AND** clicks "Save All"
- **THEN** system splits changes into batches of 50
- **AND** executes 3 batch requests sequentially
- **AND** shows progress indicator
- **AND** aggregates results from all batches

#### Scenario: Batch size warning
- **WHEN** user accumulates 150 pending changes
- **THEN** system shows warning: "You have many pending changes. Consider saving soon."
- **WHEN** user reaches 200 pending changes
- **THEN** system prevents adding more changes
- **AND** shows message: "Please save existing changes before adding more (limit: 200)"

## Related Capabilities

This capability builds upon:
- **D365 Web API Integration**: Uses existing Web API for EntityDefinitions and UpdateAttribute
- **Language Management**: Leverages existing language/LCID handling from translation tools

This capability does NOT modify:
- **Form Translation**: Separate workflow, not affected by this change
- **Option Set Translation**: Separate capability, uses different API endpoints

## Performance Targets

- Add change to pending state: <10ms
- Open review modal with 100 changes: <200ms
- Batch save 50 attributes: <5 seconds
- Publish entity: <2 seconds per entity (parallel)

## Security & Permissions

- Users MUST have write permissions on EntityDefinitions in Dynamics 365
- Batch save SHALL fail gracefully if user lacks permissions
- Error messages SHALL not expose sensitive system information

## Browser Compatibility

- Chrome/Edge (Chromium-based browsers)
- Requires ES6 Map support (all modern browsers)
- Uses standard beforeunload event (universally supported)
