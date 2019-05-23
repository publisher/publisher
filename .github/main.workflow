workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@05b981089c1272d294293b0b8ef4e2bcddcf8edb"
  secrets = [
    "GITHUB_TOKEN",
    "NPM_AUTH_TOKEN",
  ]
}

workflow "Push handler" {
  on = "push"
  resolves = ["Handle push"]
}

action "Handle push" {
  uses = "publisher/gh-actions/push@05b981089c1272d294293b0b8ef4e2bcddcf8edb"
  secrets = ["GITHUB_TOKEN"]
}
