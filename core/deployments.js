// @flow
"use strict";

/*::
type CanaryPayload = {
  id: number,
};
*/

const CanaryDeployment = {
  taskId: "publish:canary",

  serializePayload({ id } /*: CanaryPayload */) {
    const payload = {
      schema_version: 1,
      id,
    };
    return payload;
  },
  deserializePayload(deploymentPayload /*: Payload */) {
    const payload /*: any */ = deploymentPayload;
    if (payload.schema_version === 1) {
      return { id: payload.id };
    }
    throw new Error("Invalid payload schema version");
  },
};

/*::
type StablePayload = {
  id: string,
};
*/

const StableDeployment = {
  taskId: "publish:stable_test",

  serializePayload({ id } /*: StablePayload */) /*: Payload */ {
    const payload = {
      schema_version: 1,
      id,
    };
    return payload;
  },
  deserializePayload(deploymentPayload /*: Payload */) /*: StablePayload */ {
    const payload /*: any */ = deploymentPayload;
    if (payload.schema_version === 1) {
      return {
        id: payload.id,
      };
    }
    throw new Error("Invalid payload schema version");
  },
};

/*::
type Payload = Webhooks$WebhookPayloadDeploymentDeploymentPayload;
*/

module.exports = {
  CanaryDeployment,
  StableDeployment,
};
