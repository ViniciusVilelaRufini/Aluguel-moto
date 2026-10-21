import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createVoltiApp, VoltiStacks } from '../lib/volti-app';

const cache: Record<string, VoltiStacks> = {};

export function stacksFor(env: 'dev' | 'prod'): VoltiStacks {
  if (!cache[env]) cache[env] = createVoltiApp({ envName: env });
  return cache[env];
}

const templates = new Map<unknown, Template>();

export function templateOf(stack: Stack): Template {
  let t = templates.get(stack);
  if (!t) {
    t = Template.fromStack(stack);
    templates.set(stack, t);
  }
  return t;
}
