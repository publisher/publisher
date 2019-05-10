workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@236bd73c9deacdcd3a8c004a199bbcb8339448e9"
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
  uses = "publisher/gh-actions/push@236bd73c9deacdcd3a8c004a199bbcb8339448e9"
  secrets = ["GITHUB_TOKEN"]
}
