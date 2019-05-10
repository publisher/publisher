workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@a9eb5d3eee72d62777e421c09096a7d873d5ac81"
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
  uses = "publisher/gh-actions/push@a9eb5d3eee72d62777e421c09096a7d873d5ac81"
  secrets = ["GITHUB_TOKEN"]
}
