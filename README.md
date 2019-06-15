<p align="center"><img align="left" width="148" height="148" src="https://raw.githubusercontent.com/publisher/logo/master/logo.svg?sanitize=true"><h1>Publisher</h1></p>

**Software package release automation for GitHub**

<br/><br/>

Publisher manages your package versioning and release workflow.

## Features

#### CI-based publishing

- Avoids pitfalls with local publishing
- Publish credentials are not stored on developer machines
- No separate publish permissions to manage
- Use GitHub Actions or bring your own CI

#### Multi-package monorepo support

- Works with yarn workspaces
- Independent package versions

#### Pull request-based release workflow

- Collaborative editing, review, and approval of versions and release notes
- Automatically scaffolded release pull requests based on relevant changes since prior release
- No need for a locally-run CLI
- Easily extensible quality checks (via GitHub Commit Status or Check Run APIs)

#### Package change detection via hashing of published artifacts

- Detects changes to packages even if the package directory or code is not modified (e.g. pre-publish scripts, top-level Babel configuration, etc.)
- Impossible for unpublished changes to be dependended on by other packages

#### Single-click canary releases

- Easily publish canary releases from any commit on any branch

## Supported Package Ecosystems

Publisher currently supports publishing `npm`/`yarn` packages.

