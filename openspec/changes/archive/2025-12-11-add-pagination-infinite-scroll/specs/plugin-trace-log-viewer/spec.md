# Plugin Trace Log Viewer - Specification Changes

## ADDED Requirements

### Requirement: Configurable Page Size
The system SHALL allow users to configure the number of records loaded per page from the server through a page size selector in the Server Filters section, with options for 50, 100 (default), 200, 500, or 1000 records. The page size change SHALL NOT trigger an immediate API request; the new page size SHALL only be applied when the user clicks "Apply Filters".

#### Scenario: User changes page size to 500
- **GIVEN** user is viewing plugin trace logs with default page size (100)
- **AND** user has 100 records loaded in the table
- **WHEN** user selects "500" from page size dropdown
- **THEN** Server Filters section shows selected value: "500"
- **AND** NO API request is triggered
- **AND** existing 100 records remain visible in the table
- **WHEN** user clicks "Apply Filters" button
- **THEN** new API request is triggered with `Prefer: odata.maxpagesize=500` header
- **AND** results table displays up to 500 records
- **AND** previous results are cleared
- **AND** pagination state is reset

---

### Requirement: Server-Side Pagination
The system SHALL fetch plugin trace logs from the server using Dynamics 365 Web API pagination with `Prefer: odata.maxpagesize` header and `@odata.nextLink` for subsequent pages, with deterministic ordering using `$orderby=createdon desc,plugintracelogid desc`. Subsequent page requests SHALL preserve the configured page size by including the same `Prefer: odata.maxpagesize` header value.

#### Scenario: Fetch first page of logs
- **GIVEN** user has applied server filters
- **WHEN** user clicks "Apply Filters" button
- **THEN** API request includes `Prefer: odata.maxpagesize=100` header
- **AND** API request includes `$orderby=createdon desc,plugintracelogid desc`
- **AND** response contains array of PluginTraceLog records (up to 100)
- **AND** response contains `@odata.nextLink` property if more records exist
- **AND** results table displays all returned records

#### Scenario: No more results available
- **GIVEN** user has loaded all available plugin trace logs
- **WHEN** latest API response is received
- **THEN** response does NOT contain `@odata.nextLink` property
- **AND** pagination state indicates no more results (`hasMore = false`)
- **AND** infinite scroll sentinel is hidden
- **AND** results summary shows "Loaded X results (all)"

---

### Requirement: Infinite Scroll
The system SHALL automatically fetch and append the next page of results when the user scrolls to the bottom of loaded results, using the Intersection Observer API for performance with a 50px rootMargin trigger distance. Infinite scroll SHALL only be active when the table is sorted by the default server ordering (Created On descending); sorting by other columns or directions SHALL disable infinite scroll and display a notice banner with a reset option.

#### Scenario: User scrolls to bottom to load more
- **GIVEN** user has loaded first page of 100 plugin trace logs
- **AND** `@odata.nextLink` exists (more records available)
- **WHEN** user scrolls to bottom of results table
- **THEN** Intersection Observer detects sentinel element is visible
- **AND** loading spinner appears at bottom: "Loading more logs..."
- **AND** API request is sent using `@odata.nextLink` URL
- **AND** new records are appended to existing 100 records
- **AND** results table now shows 200 total records
- **AND** scroll position is maintained (user doesn't jump to top)
- **AND** sentinel remains at bottom if more results available

#### Scenario: Prevent duplicate requests during rapid scroll
- **GIVEN** user has loaded first page and more results are available
- **AND** first "load more" request is in progress
- **WHEN** user continues scrolling rapidly
- **THEN** sentinel enters viewport multiple times
- **AND** only one API request is in flight
- **AND** `isLoadingMore` flag prevents additional requests
- **AND** when first request completes, user can trigger next request

#### Scenario: Infinite scroll disabled when sorting changed
- **GIVEN** user has loaded first page of 100 plugin trace logs
- **AND** more results are available (`@odata.nextLink` exists)
- **WHEN** user clicks "Type Name" column header to sort ascending
- **THEN** table sorts client-side by Type Name ascending
- **AND** infinite scroll is automatically disabled
- **AND** notice banner appears: "Infinite scroll is disabled when sorting. More records are available on the server."
- **AND** banner includes "Reset to Default Sort" button
- **WHEN** user scrolls to bottom
- **THEN** no API request is triggered
- **AND** no loading spinner appears

#### Scenario: Reset sort to reactivate infinite scroll
- **GIVEN** user has changed sort to Type Name ascending
- **AND** infinite scroll is disabled with notice banner showing
- **WHEN** user clicks "Reset to Default Sort" button
- **THEN** table sort resets to Created On descending
- **AND** sort arrow indicator shows ↓ on Created On column
- **AND** notice banner disappears
- **AND** infinite scroll is reactivated
- **WHEN** user scrolls to bottom
- **THEN** next page loads automatically

#### Scenario: Infinite scroll stops when all loaded
- **GIVEN** user has loaded multiple pages of plugin trace logs
- **AND** latest API response does NOT include `@odata.nextLink`
- **WHEN** user scrolls to bottom of results
- **THEN** no API request is triggered
- **AND** no loading spinner appears
- **AND** sentinel element is hidden
- **AND** results summary shows "Loaded X results (all)"

---

### Requirement: Native Browser Scrollbar
The Plugin Trace Log Viewer SHALL use the browser's native scrollbar instead of a custom scrollbar implementation, removing `overflowY: 'auto'` and replacing fixed `height: '100vh'` with `minHeight: '100vh'`.

#### Scenario: Native scrollbar appears
- **GIVEN** user has loaded plugin trace logs
- **WHEN** results exceed viewport height
- **THEN** browser's native vertical scrollbar appears on right edge
- **AND** scrollbar appearance matches user's OS/browser theme
- **AND** page uses full viewport width
- **AND** no custom scrollbar styles are applied

---

### Requirement: Date Range Filter Inclusivity
The system SHALL include all logs created on the end date by using an exclusive upper bound at the next day (e.g., end date 2025-12-11 becomes `createdon lt 2025-12-12`) to ensure logs created at any time on the end date are included.

#### Scenario: End date includes all logs for that day
- **GIVEN** user applies server filters with end date "2025-12-11"
- **WHEN** API request is made
- **THEN** filter includes `createdon lt 2025-12-12` (not `createdon le 2025-12-11`)
- **AND** logs created at "2025-12-11 23:59:59" are included in results
- **AND** logs created at "2025-12-12 00:00:00" are excluded from results

---

## ADDED Requirements

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
