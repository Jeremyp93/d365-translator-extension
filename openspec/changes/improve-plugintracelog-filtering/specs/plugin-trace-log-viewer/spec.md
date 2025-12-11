# Plugin Trace Log Viewer - Specification Changes

## ADDED Requirements

### Requirement: Quick Search (Client-Side)
The system SHALL provide a quick search input that instantly filters loaded plugin trace logs on the client side without making API calls.

#### Scenario: User performs quick search
- **GIVEN** plugin trace logs have been loaded from the server (e.g., 100 logs)
- **WHEN** user types "Plugin1" in the quick search input
- **THEN** the input updates immediately with no delay
- **AND** the table displays only logs matching "Plugin1" in any searchable column
- **AND** no API request is made
- **AND** the results count shows "X of 100" format

#### Scenario: Quick search across multiple columns
- **GIVEN** plugin trace logs are displayed
- **WHEN** user enters a search term in the quick search input
- **THEN** the system searches across Type Name, Message Name, Exception Details, and Trace Log columns
- **AND** displays all logs where any of these columns contains the search term (case-insensitive)

#### Scenario: Clear quick search
- **GIVEN** quick search is active and showing filtered results
- **WHEN** user clears the quick search input
- **THEN** all loaded logs from the server are displayed again
- **AND** no API request is made

#### Scenario: Empty quick search results
- **GIVEN** quick search is active
- **WHEN** the search term matches no logs
- **THEN** an empty state message is displayed: "No results match 'X'"
- **AND** user can see they can modify the search or clear it

### Requirement: Visual Distinction Between Search and Filters
The system SHALL visually distinguish between quick search (client-side) and server filters (API-based) so users understand the difference.

#### Scenario: Visual separation
- **GIVEN** the plugin trace log page is open
- **THEN** the quick search section has a distinct appearance (lighter background, prominent placement)
- **AND** the server filters section has a distinct appearance (darker background, labeled "Server Filters" or "Advanced Filters")
- **AND** helper text explains: quick search shows "Instantly filters loaded results" and server filters show "Fetch filtered data from Dynamics 365"

#### Scenario: Results count clarity
- **GIVEN** both quick search and server filters may be active
- **WHEN** only server filters are applied
- **THEN** results count shows "X results"
- **WHEN** quick search is active
- **THEN** results count shows "X of Y results" where X is filtered count and Y is total from server

## MODIFIED Requirements

### Requirement: Server Filter Application
The system SHALL apply server filters to plugin trace logs only when the user explicitly clicks the "Apply Filters" button, not on every input change.

#### Scenario: User types in server filter and applies
- **GIVEN** the plugin trace log page is open
- **WHEN** user types "MyPlugin" in the Type Name server filter
- **AND** user types "Create" in the Message Name server filter
- **THEN** no API requests are made until user clicks "Apply Filters"
- **AND** when user clicks "Apply Filters", exactly one API request is made with both filters

#### Scenario: User changes server filters without applying
- **GIVEN** server filters have been applied and logs are displayed
- **WHEN** user modifies any server filter input
- **BUT** does not click "Apply Filters"
- **THEN** no API request is made
- **AND** the displayed logs remain unchanged (showing previous server filter results)

#### Scenario: User clears server filters
- **GIVEN** some server filters are active
- **WHEN** user clicks "Clear Filters"
- **THEN** all server filter inputs are reset to empty/default
- **AND** an API request is made to fetch unfiltered logs
- **AND** any active quick search continues to work on the new unfiltered results

### Requirement: Performance Optimization
The system SHALL minimize API calls by only querying the server when filters are explicitly applied, and provide instant client-side search for quick exploration.

#### Scenario: Rapid server filter input changes
- **GIVEN** the plugin trace log page is open
- **WHEN** user rapidly types and deletes text in multiple server filter fields
- **THEN** no API requests are made during the typing
- **AND** logs are only fetched when "Apply Filters" is clicked

#### Scenario: Quick search has no server impact
- **GIVEN** logs have been loaded from the server
- **WHEN** user types rapidly in the quick search input
- **THEN** no API requests are made
- **AND** filtering happens instantly on the client side
- **AND** results update in real-time as user types

#### Scenario: Combined filtering performance
- **GIVEN** user has applied server filters (e.g., fetched 50 logs)
- **WHEN** user uses quick search on those 50 logs
- **THEN** no additional API requests are made
- **AND** filtering is instant (client-side only)
- **AND** results count shows "X of 50" where X is the quick search matches

### Requirement: Responsive Table Layout
The system SHALL display the plugin trace log table in a responsive manner that adapts to different screen sizes while maintaining readability and functionality.

#### Scenario: Table on mobile device (< 768px)
- **GIVEN** the plugin trace log page is open on a mobile device with viewport width < 768px
- **WHEN** the page loads
- **THEN** the table container enables horizontal scrolling
- **AND** critical columns (Type Name, Message, Duration, Exception) remain visible
- **AND** less critical columns (Operation Type, Depth) are hidden or collapsed
- **AND** scroll indicators or shadows show there is more content horizontally

#### Scenario: Table on tablet (768px - 1024px)
- **GIVEN** the plugin trace log page is open on a tablet with viewport width between 768px and 1024px
- **WHEN** the page loads
- **THEN** all columns are visible with flexible widths
- **AND** important columns take priority in space allocation
- **AND** text truncation with ellipsis works properly in all cells

#### Scenario: Table on desktop (> 1024px)
- **GIVEN** the plugin trace log page is open on a desktop with viewport width > 1024px
- **WHEN** the page loads
- **THEN** the table displays in full width with all columns visible
- **AND** columns use their preferred minimum widths
- **AND** the layout matches the current desktop design

#### Scenario: Expandable rows on touch devices
- **GIVEN** the plugin trace log page is open on a touch device
- **WHEN** user taps on the expand icon for a log entry
- **THEN** the row expands to show detailed information
- **AND** the expanded content is formatted responsively
- **AND** the expanded content remains readable without horizontal scrolling

### Requirement: Filter State Management
The system SHALL maintain separate state for quick search (client-side) and server filters (API-based) to provide clear separation of concerns.

#### Scenario: Quick search state is independent
- **GIVEN** the plugin trace log page is open
- **WHEN** user types in the quick search input
- **THEN** the quick search state is updated
- **AND** server filter state remains unchanged
- **AND** displayed logs are filtered client-side from the current server results

#### Scenario: Server filter state updates independently
- **GIVEN** user has entered values in server filter inputs
- **WHEN** user clicks "Apply Filters"
- **THEN** the server filter state triggers an API request
- **AND** quick search state is preserved
- **AND** once new server results load, quick search is re-applied to the new results

#### Scenario: Clearing quick search preserves server filters
- **GIVEN** both quick search and server filters are active
- **WHEN** user clears the quick search
- **THEN** server filter results remain displayed
- **AND** no API request is made

#### Scenario: Clearing server filters preserves quick search
- **GIVEN** both quick search and server filters are active
- **WHEN** user clicks "Clear Filters" in the server filter section
- **THEN** an API request fetches unfiltered logs
- **AND** quick search is automatically re-applied to the new unfiltered results
- **AND** quick search input value is preserved

### Requirement: Loading State Feedback
The system SHALL provide clear visual feedback during server filtering operations, showing when data is being loaded from the server.

#### Scenario: Apply server filters shows loading state
- **GIVEN** user has entered server filter values
- **WHEN** user clicks "Apply Filters"
- **THEN** the "Apply Filters" button shows a loading indicator
- **AND** the button is disabled during the fetch
- **AND** the table shows a loading state
- **WHEN** the API call completes
- **THEN** the button returns to enabled state
- **AND** the table displays the filtered results

#### Scenario: Quick search shows no loading state
- **GIVEN** user is typing in the quick search input
- **THEN** no loading indicator is shown
- **AND** results update instantly as user types
- **AND** no "loading" or "fetching" states appear

#### Scenario: Error during server filter application
- **GIVEN** user clicks "Apply Filters"
- **WHEN** the API request fails
- **THEN** an error message is displayed
- **AND** the "Apply Filters" button returns to enabled state
- **AND** the previous results remain displayed (if any)
- **AND** user can modify filters and try again

### Requirement: Touch Device Support
The system SHALL ensure all interactive elements work properly on touch devices, including tablets and smartphones.

#### Scenario: Touch interactions with quick search
- **GIVEN** the plugin trace log page is open on a touch device
- **WHEN** user taps on the quick search input
- **THEN** the input receives focus and virtual keyboard appears
- **AND** input is responsive to touch typing
- **AND** typing triggers instant client-side filtering

#### Scenario: Touch interactions with server filters
- **GIVEN** the plugin trace log page is open on a touch device
- **WHEN** user taps on any server filter input
- **THEN** the input receives focus and virtual keyboard appears
- **AND** input is responsive to touch typing
- **AND** dropdowns open properly on touch

#### Scenario: Touch interactions with table
- **GIVEN** logs are displayed on a touch device
- **WHEN** user uses touch gestures to scroll the table
- **THEN** scrolling is smooth and responsive
- **AND** expand/collapse icons respond to tap gestures
- **AND** no accidental expansions occur during scrolling

## REMOVED Requirements

### Requirement: Filter Status Indication
**Reason**: With the dual filtering system (quick search + server filters), the need for "modified but not applied" indicators is removed. Server filters are clearly labeled and only apply when the user clicks the button. Quick search is instant and doesn't need status indication.

**Migration**: The visual distinction between the two filter sections provides sufficient clarity about their behavior without needing additional status badges or indicators.
The system SHALL ensure all interactive elements work properly on touch devices, including tablets and smartphones.

#### Scenario: Touch interactions with filters
- **GIVEN** the plugin trace log page is open on a touch device
- **WHEN** user taps on any filter input
- **THEN** the input receives focus and virtual keyboard appears
- **AND** input is responsive to touch typing
- **AND** dropdowns open properly on touch

#### Scenario: Touch interactions with table
- **GIVEN** logs are displayed on a touch device
- **WHEN** user uses touch gestures to scroll the table
- **THEN** scrolling is smooth and responsive
- **AND** expand/collapse icons respond to tap gestures
- **AND** no accidental expansions occur during scrolling

## REMOVED Requirements

None. This change modifies existing functionality but does not remove any user-facing features.
