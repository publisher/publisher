// @flow
"use strict";

/*::

import {Application} from "probot";

*/

const TOML = require("@iarna/toml");
const tarjan = require("@rtsao/scc");
const remark = require("remark");
const getRandomId = require("@publisher/id-generator");

const {
  DRAFT_BRANCH_PREFIX,
  RELEASE_TAG_PREFIX,
  RELEASE_NOTES_FILENAME,
  RELEASE_MANIFEST_FILENAME,
} = require("@publisher/core/releases.js");

const { PackageHashes } = require("@publisher/core/package-hashes.js");

const {
  StableDeployment,
  CanaryDeployment,
} = require("@publisher/core/deployments.js");

const { RELEASES_DIRECTORY_PATH } = require("@publisher/core/releases.js");

const CANARY_PUBLISH_ACTION_ID = "publish_canary";
const RELEASE_PR_ACTION_ID = "release_pr";

module.exports = (app /*: Application */) => {
  // TODO
  // On pull request created/updated,
  // prevent commits from modifying exising release TOML, except on
  // draft branches

  app.on("push", onPush);
  app.on("pull_request.closed", onPullRequestClosed);
  app.on("deployment_status", onDeploymentStatus);
  app.on("check_run.requested_action", onCheckRunRequestedAction);
};

async function onDeploymentStatus(context) {
  const { deployment_status, deployment } = context.payload;

  if (
    deployment.task !== StableDeployment.taskId ||
    deployment_status.state !== "success"
  ) {
    return;
  }

  const { id } = StableDeployment.deserializePayload(deployment.payload);

  const [result, packages] = await Promise.all([
    context.github.repos.getContents(
      context.repo({
        ref: deployment.sha,
        path: `${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_NOTES_FILENAME}`,
      }),
    ),
    getReleaseToml(context, { id, ref: deployment.sha }),
  ]);

  const md = new Buffer(result.data.content, "base64").toString();
  const formatted = await formatMarkdown(md, packages);

  const { updated_at } = deployment;

  const datetime = new Date(updated_at);
  const date = datetime.toISOString().substr(0, 10);
  const tagName = stringifyTagName({ datetime, id });

  await context.github.repos.createRelease(
    context.repo({
      tag_name: tagName,
      target_commitish: deployment.sha,
      name: `${date} "${id}"`,
      body: formatted,
    }),
  );
}

async function onCheckRunRequestedAction(context) {
  const { identifier } = context.payload.requested_action;
  if (identifier === CANARY_PUBLISH_ACTION_ID) {
    await canaryPublish(context);
  } else if (identifier === RELEASE_PR_ACTION_ID) {
    await releasePR(context);
  }
}

async function onPush(context) {
  const { ref, deleted, commits, head_commit, repository } = context.payload;
  const { default_branch } = repository;

  if (
    !ref.startsWith("refs/heads/") ||
    deleted === true ||
    head_commit === null
  ) {
    return;
  }

  const branch = ref.replace(/^refs\/heads\//, "");

  if (branch.startsWith(DRAFT_BRANCH_PREFIX)) {
    // TODO: Add publish release candidate button
    // TODO: Add dry-run publish button
    return;
  }

  const pulls = await context.github.pulls.list(
    context.repo({
      state: "open",
      base: branch,
    }),
  );

  // Close outdated release PRs
  for (const pull of pulls.data) {
    const headBranch = pull.head.ref;
    const headRepoId = pull.head.repo.id;
    if (
      repository.id === headRepoId &&
      headBranch.startsWith(DRAFT_BRANCH_PREFIX)
    ) {
      context.github.git.deleteRef(
        context.repo({ ref: `heads/${headBranch}` }),
      );
    }
  }

  // TODO: remove release PR buttons on older commits

  for (const commit of commits) {
    const actions = [
      {
        identifier: CANARY_PUBLISH_ACTION_ID,
        label: "🐤 Canary release",
        description: "Publish a canary release",
      },
    ];

    if (branch === default_branch && commit.id === head_commit.id) {
      // TODO: wait until package tarball hashes status complete adding button
      actions.push({
        identifier: RELEASE_PR_ACTION_ID,
        label: "🚀 Release PR",
        description: "Create a release PR",
      });
    }

    // TODO: consider commit `distinct` property, or see if check already exists?
    context.github.checks.create(
      context.repo({
        name: "Release",
        head_sha: commit.id,
        status: "completed",
        conclusion: "neutral",
        completed_at: new Date().toISOString(),
        ouptut: {
          title: "title",
          summary: "summary",
          text: "text",
        },
        actions: actions,
      }),
    );
  }
}

async function onPullRequestClosed(context) {
  const { pull_request, repository } = context.payload;
  const { head, merged, merge_commit_sha } = pull_request;

  if (
    merged === false ||
    head.repo.id !== repository.id ||
    !head.ref.startsWith(DRAFT_BRANCH_PREFIX)
  ) {
    return;
  }

  const [draftPrefix, shorthash, id] = head.ref.split("/");

  const payload = StableDeployment.serializePayload({ id });

  await context.github.repos.createDeployment(
    context.repo({
      ref: merge_commit_sha,
      task: StableDeployment.taskId,
      auto_merge: false,
      required_contexts: [], // Ignore all commit statuses
      payload,
      environment: "npm",
      description: "Publish merge",
    }),
  );

  await context.github.git.deleteRef(
    context.repo({ ref: `heads/${head.ref}` }),
  );
}

async function canaryPublish(context) {
  const { requested_action, check_run } = context.payload;
  const { identifier } = requested_action;
  const { head_sha } = check_run;

  const existing = await context.github.repos.listDeployments(
    context.repo({
      ref: head_sha,
      task: CanaryDeployment.taskId,
      environment: "npm",
      per_page: 100,
    }),
  );

  const id = existing.data.length;

  const payload = CanaryDeployment.serializePayload({ id });

  const result = await context.github.repos.createDeployment(
    context.repo({
      ref: head_sha,
      task: CanaryDeployment.taskId,
      auto_merge: false,
      required_contexts: [], // Ignore all commit statuses
      payload,
      environment: "npm",
      description: "Publish canary",
    }),
  );
}

function generateReleaseNotes(packages /*: PackagesContext */) {
  const notes = [];

  for (const [pkg, pkgData] of packages.entries()) {
    const items = [];

    const changes = pkgData.relevantChanges;
    if (pkgData.publish === false) {
      continue;
    }

    const priorVersion = pkgData.priorVersion;
    if (priorVersion) {
      items.push(`> *Changes since v${priorVersion}*\n`);
    }

    for (const change of changes) {
      if (change) {
        items.push(` - ${change}`);
      }
    }

    notes.push([`# ${pkg}`, ...items].join("\n"));
  }
  return notes.join("\n\n") + "\n";
}

async function generateUniqueId(context, sha, existingReleaseTags) {
  const existingIds = new Set();

  for (const tagName of existingReleaseTags.values()) {
    const id = extractIdFromReleaseTagName(tagName);
    if (id) {
      existingIds.add(id);
    }
  }

  return getRandomId(existingIds);
}

// Get a list of all tagged releases
async function getExistingTaggedReleases(context) {
  const existingReleases /*: Map<string, string> */ = new Map();

  try {
    await context.github.paginate(
      context.github.git.listRefs.endpoint.merge(
        context.repo({
          namespace: `tags/${RELEASE_TAG_PREFIX}`,
          per_page: 100,
        }),
      ),
      res => {
        for (const ref of res.data) {
          const sha = ref.object.sha;
          const tagName = ref.ref.replace(/^refs\/tags\//, "");
          existingReleases.set(sha, tagName);
        }
      },
    );
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  return existingReleases;
}

/*::

type PackageData = {
  publish: boolean,
  priorVersion?: string,
  relevantChanges: Array<string>
};

type PackagesContext = Map<string, PackageData>;

type ReleaseContext = {
  tree_sha: string,
  existingReleases: Map<string, string>,
  priorReleaseSha?: string,
  packages: PackagesContext,
}

type ReleaseToml = {
  [string]: {
    version: string,
    publish?: boolean,
  }
};

*/

async function getReleaseContext(
  context,
  sha,
  branch,
) /*: Promise<?ReleaseContext> */ {
  const headCommitStatusPromise = getPackageTarballData(context, sha);

  const [headStatus, existingReleases, refResult] = await Promise.all([
    headCommitStatusPromise,
    getExistingTaggedReleases(context),
    context.github.git.getRef(
      context.repo({
        ref: `heads/${branch}`,
      }),
    ),
  ]);

  if (
    existingReleases.has(sha) ||
    !headStatus ||
    refResult.data.object.sha !== sha
  ) {
    return;
  }

  const sorted = Object.keys(headStatus).sort();
  const packages /*: PackagesContext */ = new Map();

  if (existingReleases.size === 0) {
    const commit = await context.github.repos.getCommit(
      context.repo({ sha: sha }),
    );
    const tree_sha = commit.data.commit.tree.sha;
    for (const pkg of sorted) {
      packages.set(pkg, { publish: true, relevantChanges: [] });
    }
    return {
      packages,
      existingReleases,
      tree_sha,
    };
  }

  let priorReleaseSha;

  const relevantCommits = [];
  await context.github.paginate(
    context.github.repos.listCommits.endpoint.merge(
      context.repo({ sha, per_page: 100 }),
    ),
    (res /*: Octokit$Response<Octokit$ReposListCommitsResponse> */, done) => {
      for (const commit of res.data) {
        relevantCommits.push({
          sha: commit.sha,
          tree_sha: commit.commit.tree.sha,
          message: commit.commit.message,
          statusPromise:
            commit.sha === sha
              ? headCommitStatusPromise
              : getPackageTarballData(context, commit.sha),
        });
        if (existingReleases.has(commit.sha)) {
          priorReleaseSha = commit.sha;
          // Stop pagination early
          return void done();
        }
      }
    },
  );

  const [headCommit] = relevantCommits;

  const tree_sha = headCommit.tree_sha;

  const baseCommit = relevantCommits[relevantCommits.length - 1];
  const baseStatus = await baseCommit.statusPromise;

  const packageChanges = new Map();

  let parentCommitStatus = null;
  // Iterate from base → head
  for (const commit of relevantCommits.reverse()) {
    const status = await commit.statusPromise;

    // Commit must have its own status and immediate parent must have a status
    // Otherwise, it is not possible to precisely associate
    // this particular commit with specific changed packages
    // If this is not the case, we ignore this commit for the purposes
    // of changelog generation, because we don't necessarily know
    // which packages it belongs to
    if (status && parentCommitStatus) {
      const { modified } = diffPackages(status, parentCommitStatus);
      for (const pkg of modified) {
        const changes = packageChanges.get(pkg) || [];
        changes.push(commit.message);
        packageChanges.set(pkg, changes);
      }
    }

    parentCommitStatus = status;
  }

  let priorVersions = {};

  const releaseTag = priorReleaseSha
    ? existingReleases.get(priorReleaseSha)
    : void 0;
  if (releaseTag) {
    const id = extractIdFromReleaseTagName(releaseTag);
    const packages = await getReleaseToml(context, { id, ref: releaseTag });
    for (const pkg of Object.keys(packages)) {
      priorVersions[pkg] = packages[pkg].version;
    }
  }

  const overallDiff = diffPackages(headStatus, baseStatus);
  for (const pkg of sorted) {
    packages.set(pkg, {
      publish: overallDiff.modified.has(pkg),
      relevantChanges: packageChanges.get(pkg) || [],
      priorVersion: priorVersions[pkg],
    });
  }

  return {
    tree_sha,
    priorReleaseSha,
    existingReleases,
    packages,
  };
}

async function releasePR(
  context /*: Context<Webhooks$WebhookPayloadCheckRun> */,
) {
  const { requested_action, check_run, repository } = context.payload;
  const { identifier } = requested_action;
  const { head_sha, check_suite } = check_run;

  const { head_branch } = check_suite;

  if (!head_branch === null) {
    // TODO: Precisely determine branch for commit
    head_branch === "master";
  }

  const shorthash = head_sha.substr(0, 7);

  const releaseContext = await getReleaseContext(
    context,
    head_sha,
    head_branch,
  );

  if (!releaseContext) {
    return;
  }

  const {
    tree_sha,
    priorReleaseSha,
    packages,
    existingReleases,
  } = releaseContext;

  const finalTomlContent = generateRelease(packages);
  const releaseNotes = generateReleaseNotes(packages);

  const id = await generateUniqueId(context, head_sha, existingReleases);

  const commitResponse = await commitFiles(context, {
    message: `Scaffold release for ${shorthash}`,
    parentSha: head_sha,
    baseTreeSha: tree_sha,
    files: [
      {
        path: `${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_MANIFEST_FILENAME}`,
        content: finalTomlContent,
      },
      {
        path: `${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_NOTES_FILENAME}`,
        content: releaseNotes,
      },
    ],
  });

  const responseCommitSha = commitResponse.data.sha;

  const uid = responseCommitSha.slice(0, 4);

  const draftBranch = `${DRAFT_BRANCH_PREFIX}${shorthash}/${id}/${uid}`;

  await context.github.git.createRef(
    context.repo({
      sha: responseCommitSha,
      ref: `refs/heads/${draftBranch}`,
    }),
  );

  const pullResult = await context.github.pulls.create(
    context.repo({
      head: draftBranch,
      base: head_branch,
      title: `Release ${shorthash} (${id})`,
      maintainer_can_modify: true,
      draft: true,
      mediaType: {
        previews: ["shadow-cat"], // draft support
      },
    }),
  );

  const { number } = pullResult.data;

  const { html_url, full_name } = repository;

  const body = generateReleasePullRequestBody({
    id: id,
    html_url,
    number,
    full_name,
    branch: draftBranch,
    priorReleaseSha,
    compareHead: head_sha,
  });

  await context.github.pulls.update(
    context.repo({
      number,
      body,
    }),
  );
}

async function commitFiles(
  context,
  { baseTreeSha, files, message, parentSha },
) {
  const tree = files.map(file => {
    return {
      path: file.path,
      type: "blob",
      mode: "100644",
      content: file.content,
    };
  });

  const treeResponse = await context.github.git.createTree(
    context.repo({ tree, base_tree: baseTreeSha }),
  );

  return context.github.git.createCommit(
    context.repo({
      message,
      tree: treeResponse.data.sha,
      parents: [parentSha],
    }),
  );
}

/*::

type PackageStatus = {
  [string]: {|
    shasum: string,
    localDependencies: Array<string>
  |}
};

*/

async function getPackageTarballData(context, sha) /*: ?PackageStatus */ {
  try {
    const result = await context.github.checks.listForRef(
      context.repo({
        ref: sha,
        check_name: PackageHashes.checkRunName,
        status: "completed",
        filter: "latest",
        per_page: 1,
      }),
    );
    if (result.data.total_count === 0) {
      return void 0;
    }
    const [run] = result.data.check_runs;
    const json = JSON.parse(run.output.text);
    if (json.schema_version === 1) {
      return json.packages;
    }
    console.error(
      `Invalid schema_version: ${json.schema_version} for commit: ${sha}`,
    );
    return void 0;
  } catch (err) {
    return void 0;
  }
}

function generateRelease(packages /*: PackagesContext */) {
  const changedTomlParts = [];
  const unchangedTomlParts = [];

  for (const [pkg, pkgData] of packages.entries()) {
    if (pkgData.publish === false) {
      unchangedTomlParts.push(
        TOML.stringify({
          [pkg]: { publish: false, version: pkgData.priorVersion },
        }),
      );
    } else {
      const [first, second] = TOML.stringify({
        [pkg]: { version: "TODO" },
      }).split("\n");

      const subparts = pkgData.priorVersion
        ? [first, `# prior : "${pkgData.priorVersion}"`, second]
        : [first, second];

      changedTomlParts.push(subparts.join("\n"));
    }
  }

  const tomlContent = [
    `# ═════ Packages to publish ═════`,
    "\n\n",
    changedTomlParts.join("\n\n"),
  ];

  if (unchangedTomlParts.length) {
    tomlContent.push(
      "\n\n",
      `# ═════ Unchanged packages ═════`,
      "\n\n",
      unchangedTomlParts.join("\n"),
      "\n",
    );
  }

  const finalTomlContent = tomlContent.join("") + "\n";
  return finalTomlContent;
}

function generateReleasePullRequestBody({
  id,
  number,
  full_name,
  html_url,
  branch,
  priorReleaseSha,
  compareHead,
}) {
  const encodedPath = encodeURIComponent(`/${full_name}/pull/${number}`);
  const editVersions = `${html_url}/edit/${branch}/${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_MANIFEST_FILENAME}?pr=${encodedPath}`;
  const viewNotes = `${html_url}/blob/${branch}/${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_NOTES_FILENAME}`;
  const editNotes = `${html_url}/edit/${branch}/${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_NOTES_FILENAME}?pr=${encodedPath}`;

  const compareUrl = priorReleaseSha
    ? `${html_url}/compare/${priorReleaseSha}...${compareHead}`
    : null;

  const priorReleaseItem = compareUrl
    ? `[Changes since prior release](${compareUrl})`
    : `No prior release found.`;

  return `
[Edit versions](${editVersions})
[View release notes](${viewNotes})
[Edit release notes](${editNotes})
${priorReleaseItem}
`;
}

async function getReleaseToml(
  context,
  { id, ref } /*: {id: string, ref: string} */,
) /*: Promise<ReleaseToml> */ {
  const result = await context.github.repos.getContents(
    context.repo({
      path: `${RELEASES_DIRECTORY_PATH}/${id}/${RELEASE_MANIFEST_FILENAME}`,
      ref,
    }),
  );
  const toml = new Buffer(result.data.content, "base64").toString();
  return TOML.parse(toml);
}

function diffPackages(
  headPackages /*: PackageStatus */,
  basePackages /*: ?PackageStatus */,
) {
  if (!basePackages) {
    basePackages = {};
  }

  const digraph = new Map();
  for (const pkg of Object.keys(headPackages)) {
    digraph.set(pkg, new Set(headPackages[pkg].localDependencies));
  }
  const scc = tarjan(digraph);

  const modified = new Set(); // Modified directly
  const needsPublishing = new Set(); // Effectively transitive closure

  // Topological ordering of SCC is crucial here.
  // Dependencies will be visited first (and thus already marked as modified)
  for (const component of scc) {
    let componentNeedsPublishing = false;

    // First add packages to modified
    for (const pkg of component) {
      const data = headPackages[pkg];
      for (const dep of data.localDependencies) {
        if (needsPublishing.has(dep)) {
          componentNeedsPublishing = true;
        }
      }
      const headShasum = data.shasum;
      const priorShasum = basePackages[pkg] ? basePackages[pkg].shasum : void 0;
      if (priorShasum !== headShasum) {
        modified.add(pkg);
        componentNeedsPublishing = true;
      }
    }

    if (componentNeedsPublishing) {
      for (const pkg of component) {
        needsPublishing.add(pkg);
      }
    }
  }

  const baseSet = new Set(Object.keys(basePackages));
  const headSet = new Set(Object.keys(headPackages));

  const added = difference(headSet, baseSet);
  const deleted = difference(baseSet, headSet);
  const depsUpdated = difference(needsPublishing, modified);

  // TODO: better changelogs
  return { modified: needsPublishing };
  // return { needsPublishing, modified, deleted, added, depsUpdated };
}

async function formatMarkdown(
  md /*: string */,
  packages,
) /*: Promise<string> */ {
  const result = await remark()
    .use(() => (tree, file) => {
      for (const child of tree.children) {
        if (child.type !== "heading" || child.depth !== 1) {
          continue;
        }
        if (child.children.length !== 1) {
          continue;
        }
        const [node] = child.children;
        if (node.type !== "text") {
          continue;
        }
        const text /*: string */ = node.value;
        if (packages[text]) {
          node.value = `${text}@${packages[text].version}`;
        }
      }
    })
    .use({
      settings: { gfm: true },
    })
    .process(md);

  return result.contents;
}

/*::

type ReleaseTag = {
  datetime: Date,
  id: string,
};

*/

function stringifyTagName({ datetime, id } /*: ReleaseTag */) /*: string */ {
  const iso = datetime.toISOString();
  const isoDate = iso.substr(0, 10);

  const hours = String(datetime.getUTCHours()).padStart(2, "0");
  const minutes = String(datetime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(datetime.getUTCSeconds()).padStart(2, "0");
  // Note: colons cannot be used in git tags
  const time = `${hours}${minutes}${seconds}`;

  return `${RELEASE_TAG_PREFIX}${isoDate}/${time}/${id}`;
}

function extractIdFromReleaseTagName(tagName) {
  const [_prefix, _date, _time, id] = tagName.split("/");
  return id;
}

function difference(setA, setB) {
  const result = new Set(setA);
  for (const item of setB) {
    result.delete(item);
  }
  return result;
}
