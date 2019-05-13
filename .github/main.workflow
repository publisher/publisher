workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@0e4361e7c19c091a3099545bbfa86d850f3d11ab"
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
  uses = "publisher/gh-actions/push@0e4361e7c19c091a3099545bbfa86d850f3d11ab"
  secrets = ["GITHUB_TOKEN"]
}
