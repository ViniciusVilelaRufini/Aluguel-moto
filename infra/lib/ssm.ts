import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

/** Publishes a value at /volti/<env>/<name>, the contract with the other services. */
export function publishParam(scope: Construct, env: string, name: string, value: string): ssm.StringParameter {
  return new ssm.StringParameter(scope, `Param-${name.replace(/[^A-Za-z0-9]/g, '-')}`, {
    parameterName: `/volti/${env}/${name}`,
    stringValue: value,
  });
}
