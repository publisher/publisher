workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@97659c6b3096d5fe62ca18a4a7d92a67ed2b9090"
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
  uses = "publisher/gh-actions/push@97659c6b3096d5fe62ca18a4a7d92a67ed2b9090"
  secrets = ["GITHUB_TOKEN"]
}
