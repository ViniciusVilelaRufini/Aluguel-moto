import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Template } from 'aws-cdk-lib/assertions';
import { stacksFor } from './helpers';

/**
 * Guard for the prod templates: SHA-256 of every synthesized prod stack against test/fixtures/prod-templates.sha256.json.
 * Lacunas T20 (minimum-cost dev profile) must not change prod by a single byte. A deliberate prod change (or a CDK upgrade)
 * regenerates the fixture: UPDATE_PROD_FINGERPRINT=1 pnpm --filter infra test -- prod-fingerprint, and the diff is reviewed.
 */
const FIXTURE = join(__dirname, 'fixtures', 'prod-templates.sha256.json');

describe('prod templates fingerprint', () => {
  it('every prod stack template is unchanged', () => {
    const s = stacksFor('prod');
    const stacks = [s.network, s.waf!, s.adminWeb, s.data, s.auth, s.messaging, s.iot, s.api, s.observability];
    const actual: Record<string, string> = {};
    for (const stack of stacks) {
      actual[stack.stackName] = createHash('sha256').update(JSON.stringify(Template.fromStack(stack).toJSON())).digest('hex');
    }
    if (process.env.UPDATE_PROD_FINGERPRINT === '1') writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 2)}\n`);
    expect(actual).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf8')));
  });
});
