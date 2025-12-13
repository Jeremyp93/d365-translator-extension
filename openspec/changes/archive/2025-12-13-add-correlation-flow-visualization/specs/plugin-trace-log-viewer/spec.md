# Plugin Trace Log Viewer Specification Delta

This document describes changes to the Plugin Trace Log Viewer specification for the correlation flow visualization feature.

## ADDED Requirements

### Requirement: Correlation Flow Visualization Panel

The system SHALL provide a Fluent UI Panel that displays an interactive swimlane diagram showing the complete execution flow for a correlation ID when the user clicks "View flow" action on any trace log row.

**Acceptance Criteria:**
- Panel opens on right side of screen when "View flow" action clicked
- Panel header displays the correlation ID
- Panel includes close button to dismiss the panel
- Panel shows loading spinner while fetching correlation data
- Panel shows error message if fetching correlation data fails
- Panel displays React Flow-based swimlane diagram when data loads successfully
- Diagram organizes operations into vertical lanes by depth (0, 1, 2, etc.)
- Diagram positions operations vertically by execution order (earliest at top)
- Each node displays: operation type name, stage, duration, and exception indicator
- Edges connect operations showing sequence (same depth) and parent-child relationships

#### Opening Correlation Flow Panel
Given I am viewing plugin trace logs in the results table  
When I click the "View flow" action for a row  
Then the correlation flow panel opens  
And the panel header displays the correlation ID  
And the panel begins fetching logs for that correlation ID

#### Viewing Flow Diagram After Load
Given the correlation flow panel is fetching data  
When the data loads successfully  
Then the loading spinner disappears  
And the swimlane diagram renders  
And operations are organized into depth-based lanes  
And operations are positioned vertically by execution order  
And nodes display type name, stage, duration, and exception status

#### Handling Fetch Errors
Given the correlation flow panel is fetching data  
When the fetch operation fails  
Then the loading spinner disappears  
And an error message is displayed  
And the error message includes a retry option

#### Closing the Panel
Given the correlation flow panel is open  
When I click the close button  
Then the panel closes  
And the diagram is hidden  
And the cached data remains in memory for the session

### Requirement: On-Demand Correlation Fetching

The system SHALL fetch correlation flow data from D365 only when the user opens the flow panel for a specific correlation ID, with session-level caching to avoid redundant API calls for previously viewed correlations.

**Acceptance Criteria:**
- No correlation data fetched during initial page load
- Correlation data fetched when panel opens with new correlation ID
- Fetched data includes all trace logs matching the correlation ID
- Fetched data is cached for the user session
- Cached data is reused when opening the same correlation again
- Cache is cleared when filters change (date range, entity, etc.)

#### First Time Opening Correlation Flow
Given I have not viewed the correlation flow for correlation ID "abc-123"  
When I click "View flow" for a log with correlation ID "abc-123"  
Then an API request is sent to D365 with filter `$filter=correlationid eq 'abc-123'`  
And the loading spinner is displayed  
And when the response arrives, the data is cached and displayed

#### Opening Previously Viewed Correlation
Given I have already viewed the correlation flow for correlation ID "abc-123"  
And the data is cached in memory  
When I click "View flow" for another log with correlation ID "abc-123"  
Then no API request is sent  
And the cached diagram is displayed immediately

#### Cache Invalidation on Filter Change
Given I have cached correlation flow data for several correlation IDs  
When I change any filter (date range, entity, message, etc.)  
Then the cache is cleared  
And if I open a correlation flow, fresh data is fetched

### Requirement: Interactive Diagram Navigation

The system SHALL allow users to click nodes in the diagram to navigate to the corresponding row in the results table, with the table automatically scrolling to the row and expanding it to show full details.

**Acceptance Criteria:**
- Clicking a node in the diagram selects the corresponding row in the table
- The table scrolls to bring the selected row into view
- The selected row expands to show full details
- The node in the diagram receives visual feedback (highlight) when selected
- Node clicks work even when table has 100+ rows loaded

#### Navigating from Diagram to Table
Given the correlation flow panel is open with a diagram displayed  
And the results table has multiple rows loaded  
When I click a node in the diagram  
Then the corresponding row in the table is selected  
And the table scrolls to bring the row into view  
And the row expands to show details  
And the node receives a visual highlight in the diagram

#### Node Click with Row Already Expanded
Given a row is already expanded in the results table  
And the correlation flow panel is open showing the diagram  
When I click the node corresponding to that expanded row  
Then the table scrolls to the row  
And the row remains expanded  
And the node receives a visual highlight

### Requirement: Bidirectional Table-Diagram Sync

The system SHALL synchronize visual state between the results table and the correlation flow diagram, highlighting nodes when their corresponding rows are expanded and updating row selection when nodes are clicked.

**Acceptance Criteria:**
- Expanded rows have their corresponding nodes highlighted in the diagram
- Selected row has its node highlighted with a distinct style
- Multiple expanded rows can have highlighted nodes simultaneously
- Node highlights update immediately when row expansion state changes
- Clicking a node updates the table selection and triggers row expansion
- Sync works even when panel is switched to a different correlation

#### Table Row Expansion Highlights Node
Given the correlation flow panel is open  
And the diagram for correlation "abc-123" is displayed  
When I expand a row in the table for a log with correlation "abc-123"  
Then the corresponding node in the diagram is highlighted  
And the highlight uses a subtle background color change

#### Selected Row Has Distinct Node Highlight
Given the correlation flow panel is open  
And I have expanded multiple rows in the table  
When I click to select one of the expanded rows  
Then the selected row's node receives a distinct highlight (e.g., border)  
And other expanded rows' nodes retain their subtle highlight  
And the node highlights are visually distinguishable

#### Node Click Triggers Row Expansion and Selection
Given the correlation flow panel is open  
And a row in the table is not expanded  
When I click the corresponding node in the diagram  
Then the row expands  
And the row is selected  
And the node receives the selected highlight style

#### Panel Switching Does Not Break Sync
Given the correlation flow panel is open for correlation "abc-123"  
And I have a row selected  
When I click "View flow" for a different correlation "def-456"  
Then the panel switches to show correlation "def-456"  
And the previously selected row remains selected in the table  
And if I switch back to "abc-123", the node highlights correctly reflect the current table state

### Requirement: Flow Caching

The system SHALL cache fetched correlation flow data in memory for the user session using an LRU (Least Recently Used) eviction strategy with a maximum of 20 cached correlations, invalidating the cache when filters change.

**Acceptance Criteria:**
- Cache stores up to 20 correlation flow datasets
- Cache uses Least Recently Used (LRU) eviction when exceeding 20 items
- Cache is session-only (cleared on page refresh)
- Cache is invalidated when filters change
- Cache hits avoid API calls entirely
- Cache misses trigger fresh fetch

#### Cache Hit Avoids API Call
Given I have viewed the correlation flow for correlation "abc-123" previously  
And the data is in the cache  
When I open the flow panel for correlation "abc-123" again  
Then no API request is made  
And the diagram renders immediately from cached data

#### LRU Eviction After 20 Correlations
Given I have viewed flow diagrams for 20 different correlations  
And the cache is full  
When I view the flow for a 21st correlation  
Then the least recently used correlation data is evicted from the cache  
And the new correlation data is added to the cache

#### Cache Cleared on Filter Change
Given I have cached correlation flow data  
When I change the date range filter  
Then the cache is cleared  
And if I open a correlation flow, fresh data is fetched

#### Session-Only Cache
Given I have cached correlation flow data during my session  
When I refresh the browser page  
Then the cache is empty  
And opening a correlation flow fetches fresh data
