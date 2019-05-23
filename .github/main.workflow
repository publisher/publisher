workflow "Deployment handler" {
  on = "deployment"
  resolves = ["Handle deployment"]
}

action "Handle deployment" {
  uses = "publisher/gh-actions/deployment@b872ea212f053da8580a5824d75e78b1ca527b74"
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
  uses = "publisher/gh-actions/push@b872ea212f053da8580a5824d75e78b1ca527b74"
  secrets = ["GITHUB_TOKEN"]
}
