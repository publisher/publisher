workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@46b383db52dfab6fe8ed05843d58ecf103a0a2a7"
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
  uses = "publisher/gh-actions/push@46b383db52dfab6fe8ed05843d58ecf103a0a2a7"
  secrets = ["GITHUB_TOKEN"]
}
