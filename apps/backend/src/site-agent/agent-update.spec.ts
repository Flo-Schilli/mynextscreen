import type { SiteAgent } from '../db/schema';
import {
  isAgentOutdated,
  latestAgentVersion,
  parseReleaseVersion,
  withUpdateInfo,
} from './agent-update';

describe('parseReleaseVersion', () => {
  it.each([
    ['1.2.3', [1, 2, 3]],
    ['v0.18.0', [0, 18, 0]],
    [' 10.0.1 ', [10, 0, 1]],
  ])('reads %p', (input, expected) => {
    expect(parseReleaseVersion(input)).toEqual(expected);
  });

  it.each([null, undefined, '', '0.0.0-dev', '1.2', '1.2.3.4', 'latest'])('refuses %p', (input) => {
    expect(parseReleaseVersion(input)).toBeNull();
  });
});

describe('isAgentOutdated', () => {
  it.each([
    ['0.17.2', '0.18.0', true],
    ['0.18.0', '0.18.1', true],
    ['0.9.0', '0.10.0', true],
    ['0.18.0', '0.18.0', false],
    ['0.19.0', '0.18.0', false],
  ])('agent %p against %p → %p', (agent, latest, expected) => {
    expect(isAgentOutdated(agent, latest)).toBe(expected);
  });

  // A dev build on either side says nothing about what is released.
  it.each([
    ['0.0.0-dev', '0.18.0'],
    ['0.17.0', '0.0.0-dev'],
    [null, '0.18.0'],
    ['0.17.0', null],
  ])('does not flag %p against %p', (agent, latest) => {
    expect(isAgentOutdated(agent, latest)).toBe(false);
  });
});

describe('latestAgentVersion', () => {
  it('is the server release', () => {
    expect(latestAgentVersion('0.18.0')).toBe('0.18.0');
  });

  it('is null on a dev build or without a version', () => {
    expect(latestAgentVersion('0.0.0-dev')).toBeNull();
    expect(latestAgentVersion(undefined)).toBeNull();
  });
});

describe('withUpdateInfo', () => {
  const agent = { id: 'a1', agentVersion: '0.17.0' } as SiteAgent;

  it('adds the latest version and the flag without touching the agent', () => {
    const result = withUpdateInfo(agent, '0.18.0');

    expect(result).toMatchObject({
      id: 'a1',
      latestAgentVersion: '0.18.0',
      updateAvailable: true,
    });
    expect(agent).not.toHaveProperty('updateAvailable');
  });
});
