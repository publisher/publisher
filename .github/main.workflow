workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@fb6eb71f764f9c533917e8a3a1b534ea44959bf0"
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
  uses = "publisher/gh-actions/push@fb6eb71f764f9c533917e8a3a1b534ea44959bf0"
  secrets = ["GITHUB_TOKEN"]
}
