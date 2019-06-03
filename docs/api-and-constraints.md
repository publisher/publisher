# Constraints

- Only "squash and merge" allowed
- Need package tarball hash job to run on every commit
- Enforce that branches to be up-to-date must be enabled

# API

## `.publisher` directory

### `.publisher/releases`

`.publisher/releases/windy-hill`

## Release files

### Markdown

Packages must be top-level headings and title must be exact package. Changes can be any markdown.

```md
# pkg-name-one

<!-- notes for this package, can be any markdown -->

# pkg-name-two

<!-- notes for this package, can be any markdown -->
```

This makes for easy parsing and manipulation

### TOML

Packages must be top level items.

```toml

[pkg-name-one]
version = "0.1.2"

[pkg-name-two]
version = "3.4.5"
publish = false

```

## Branches

- Branch names beginning with `draft-releases/` are reserved.

## Tags

- Tag names beginning with `releases/` are reserved.

## GitHub Deployments

#### Example Release Payload

`npm:stable`

```json
{
  "id": "windy-hill"
}
```

#### Example Canary Payload

`npm:canary`

```json
{
  "schema_version": "2",
  "id": 3,
  "unchangedPackages": {
    "foo": {"version": "1.2.3"},
    "bar": {"version": "4.5.6"}
  }
}
```

## Check Runs

Each commit should have a check run status.

#### Example

```json
{
  "schema_version": 1,
  "packages": {
    "foo": {
      "shasum": "c31717bf602b4a90a47fcd0b0c841cf965851d0a",
      "localDependencies": ["bar"]
    },
    "bar": {
      "shasum": "82ef140439a37a6ed3abad6654d955df8953dcef",
      "localDependencies": []
    }
  }
}
```
