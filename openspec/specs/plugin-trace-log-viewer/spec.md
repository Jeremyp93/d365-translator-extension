# plugin-trace-log-viewer Specification

## Purpose
TBD - created by archiving change add-pagination-infinite-scroll. Update Purpose after archive.
## Requirements
### Requirement: Data Retrieval
The system SHALL retrieve plugin trace logs from Dynamics 365 via Web API using server-side pagination. Initial fetch SHALL return up to configured page size (default 100). Additional pages SHALL be loaded on-demand via infinite scroll.

#### Scenario: Paginated retrieval with filters
- **GIVEN** user has applied server filters: Type Code = "ExecutionFailure"
- **AND** page size is set to 100
- **WHEN** user clicks "Apply Filters"
- **THEN** API request includes filter: `$filter=typecode eq 2`
- **AND** API request includes `Prefer: odata.maxpagesize=100`
- **AND** API request includes `$orderby=createdon desc,plugintracelogid desc`
- **AND** response returns up to 100 matching records
- **AND** response includes `@odata.nextLink` if more than 100 matches exist
- **AND** results table displays returned records
- **AND** infinite scroll allows loading additional pages

---

### Requirement: Loading States
The system SHALL provide visual feedback during initial data loading AND subsequent page loading via infinite scroll, distinguishing between initial load and "loading more" states.

#### Scenario: Loading more results indicator
- **GIVEN** user has loaded first page of 100 logs
- **AND** more results are available (`@odata.nextLink` exists)
- **WHEN** user scrolls to bottom and next page fetch begins
- **THEN** spinner appears at bottom of results with label: "Loading more logs..."
- **AND** existing 100 results remain visible and scrollable
- **AND** results summary shows: "Loaded 100 of 100+ results"
- **WHEN** fetch completes
- **THEN** spinner disappears
- **AND** results summary updates: "Loaded 200 of 200+ results"

---

