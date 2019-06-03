// @flow
"use strict";

const path = require("path");

const Octokit = require("@octokit/rest");

const RELEASE_VALIDATION_CHECK_NAME = "Release validation";

const { DRAFT_BRANCH_PREFIX } = require("@publisher/core/releases.js");
const { PackageHashes } = require("@publisher/core/package-hashes.js");

const { getWorkspaces } = require("@publisher/yarn-helpers");
const { pack } = require("@publisher/npm-helpers");

module.exports = pushHandler;

async function pushHandler(
  token /*: string */,
  eventPayload /*: Webhooks$WebhookPayloadPush */,
) {
  const github = new Octokit({ auth: `token ${token}` });
  const { ref, head_commit, deleted } = eventPayload;
  if (head_commit === null || deleted === true) {
    console.log("Ref was deleted, skipping push event.");
    return;
  }
  if (ref.startsWith(`refs/heads/${DRAFT_BRANCH_PREFIX}`)) {
    await validateRelease(github, eventPayload);
  } else {
    await getChangedPackages(github, eventPayload);
  }
}

async function validateRelease(github, payload) {
  const { after: head_sha, repository } = payload;
  const started_at = new Date().toISOString();

  const check = await github.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    name: RELEASE_VALIDATION_CHECK_NAME,
    head_sha,
    status: "in_progress",
    started_at,
    // output: {
    //   title: "Package tarball hashes",
    //   summary: "Package tarball hashes",
    //   text: serialized,
    // },
  });

  const { id: check_run_id } = check.data;

  try {
    // const workspaces = await getWorkspaces();

    // TODO: validate

    await github.checks.update({
      owner: repository.owner.login,
      repo: repository.name,
      check_run_id,
      status: "completed",
      completed_at: new Date().toISOString(),
      conclusion: "success",
      // output: {
      //   title: "Package tarball hashes",
      //   summary: "Package tarball hashes",
      //   text: serialized,
      // },
    });
  } catch (err) {
    await github.checks.update({
      owner: repository.owner.login,
      repo: repository.name,
      check_run_id,
      status: "completed",
      completed_at: new Date().toISOString(),
      conclusion: "failure",
      // output: {
      //   title: "Package tarball hashes",
      //   summary: "Package tarball hashes",
      //   text: serialized,
      // },
    });
  }
}

async function getChangedPackages(github, payload) {
  const { after: head_sha, repository } = payload;
  const started_at = new Date().toISOString();
  const workspaces = await getWorkspaces();
  const packages = await getPackedHashes(workspaces);

  const serialized = JSON.stringify(
    {
      schema_version: 1,
      packages,
    },
    null,
    2,
  );

  await github.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    name: PackageHashes.checkRunName,
    head_sha,
    status: "completed",
    started_at,
    completed_at: new Date().toISOString(),
    conclusion: "success",
    output: {
      title: "Package tarball hashes",
      summary: "Package tarball hashes",
      text: serialized,
    },
  });
}

async function getPackedHashes(workspaces) {
  const packed = await Promise.all(
    Object.entries(workspaces).map(
      async ([pkgId, { location, workspaceDependencies }]) => {
        const packed = await pack(path.join(process.cwd(), location));

        return {
          name: pkgId,
          shasum: packed.shasum,
          workspaceDependencies,
        };
      },
    ),
  );

  const data = {};
  for (const item of packed) {
    data[item.name] = {
      shasum: item.shasum,
      localDependencies: item.workspaceDependencies,
    };
  }
  return data;
}
