workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@3b17ebcb070ae61313e3eafaa01c6b388d00cd46"
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
  uses = "publisher/gh-actions/push@3b17ebcb070ae61313e3eafaa01c6b388d00cd46"
  secrets = ["GITHUB_TOKEN"]
}
