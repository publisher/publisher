const token = process.env.GH_TOKEN;

if (!token) {
  console.error("GH_TOKEN is required");
  process.exit(1);
}

const [, , repo_slug, sha] = process.argv;

if (!repo_slug || !sha) {
  console.error(`Usage: canary.js [repo_slug] [git_sha]`);
  process.exit(1);
}

const [owner, repo] = repo_slug.split("/");

const Octokit = require("@octokit/rest");
const { canaryPublish } = require("@publisher/probot-app");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  `Publishing canary release for repo: ${owner}/${repo} at commit: ${sha}
Continue? [y/n] `,
  answer => {
    rl.close();
    if (answer === "y") {
      localCanaryPublish({ token, owner, repo, sha })
        .then(() => {
          console.log("Success");
        })
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    } else {
      console.log("Aborting.");
    }
  },
);

async function localCanaryPublish({ token, owner, repo, sha }) {
  const github = new Octokit({
    auth: token,
  });

  const mockContext /*: any */ = {
    github,
    repo: opts => ({ ...opts, owner, repo }),
    payload: {
      check_run: {
        check_suite: {
          head_branch: null,
        },
        head_sha: sha,
      },
    },
  };
  const checkRunContext /*: Context<Webhooks$WebhookPayloadCheckRun> */ = mockContext;
  await canaryPublish(checkRunContext);
}
