## MODIFIED Requirements

### Requirement: Accounts page

The Accounts page SHALL display a two-column layout: left panel with searchable account list, import button, and add account button; right panel with selected account details including usage, token info, and actions (pause/resume/delete/re-authenticate). The browser OAuth stage SHALL show an authorization URL with a copy action that remains functional in secure and non-secure contexts.

The Accounts page SHALL also allow exporting a selected account as an OpenCode-compatible `auth.json` payload with explicit raw-token warnings.

#### Scenario: Targeted OAuth re-authentication updates the selected account
- **GIVEN** an operator opens the re-authenticate action for account A
- **WHEN** the OAuth flow is started from that action
- **THEN** the dashboard sends account A's id as the re-authentication target
- **AND** OAuth callback completion updates account A instead of using the generic add-account persistence path

#### Scenario: Targeted OAuth re-authentication rejects the wrong identity
- **GIVEN** account A has a stored upstream ChatGPT identity
- **WHEN** a targeted re-authentication for account A completes with tokens for a different upstream ChatGPT identity
- **THEN** the flow fails with an operator-visible error
- **AND** account A remains unchanged

#### Scenario: Add-account OAuth remains generic
- **WHEN** an operator starts OAuth from the add account action
- **THEN** the dashboard does not send a re-authentication target
- **AND** the OAuth completion uses the generic add-account persistence path
