workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@e89d54e5ed1f88e63175ee73fe4385d688c09f18"
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
  uses = "publisher/gh-actions/push@e89d54e5ed1f88e63175ee73fe4385d688c09f18"
  secrets = ["GITHUB_TOKEN"]
}
