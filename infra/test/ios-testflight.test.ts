import { readFileSync } from 'fs';
import { join } from 'path';

// Line-based assertions: no YAML parser is declared in the infra workspace.
const yml = readFileSync(join(__dirname, '..', '..', '.github', 'workflows', 'ios-testflight.yml'), 'utf8').replace(/\r\n/g, '\n');
const lines = yml.split('\n');

interface Step {
  index: number;
  text: string;
}

// Steps of the single job: each starts at a line "      - ".
function steps(): Step[] {
  const out: Step[] = [];
  let cur: string[] | null = null;
  for (const l of lines) {
    if (/^ {6}- /.test(l)) {
      if (cur) out.push({ index: out.length, text: cur.join('\n') });
      cur = [l];
    } else if (cur) {
      cur.push(l);
    }
  }
  if (cur) out.push({ index: out.length, text: cur.join('\n') });
  return out;
}

const all = steps();
const find = (re: RegExp): Step => {
  const s = all.find((x) => re.test(x.text));
  if (!s) throw new Error(`step not found: ${re}`);
  return s;
};

describe('ios-testflight workflow', () => {
  // The archive is unsigned (CODE_SIGNING_ALLOWED=NO): only the export step signs in the Apple cloud with the key.
  it('archives without signing, so the archive step does not need the App Store Connect key', () => {
    expect(find(/xcodebuild archive/).text).toContain('CODE_SIGNING_ALLOWED=NO');
    expect(find(/xcodebuild archive/).text).not.toMatch(/authenticationKey|AuthKey_/);
  });

  it('writes the .p8 only after pub get, tests, config-only build and archive', () => {
    const write = find(/AuthKey_[^\n]*\.p8"?\s*$|printf[^\n]*>[^\n]*\.p8/m);
    for (const re of [/flutter pub get/, /flutter test/, /--config-only/, /xcodebuild archive/]) {
      expect(write.index).toBeGreaterThan(find(re).index);
    }
    expect(write.index).toBeLessThan(find(/-exportArchive/).index);
  });

  it('writes the key in the step immediately before the first one that uses it', () => {
    const write = find(/printf[^\n]*>[^\n]*\.p8/);
    const firstUse = all.find((s) => /-authenticationKeyPath/.test(s.text))!;
    expect(firstUse.index).toBe(write.index + 1);
  });

  it('never exposes the key secret outside the key-writing step', () => {
    const write = find(/printf[^\n]*>[^\n]*\.p8/);
    for (const s of all) if (s !== write) expect(s.text).not.toContain('secrets.ASC_KEY_P8');
  });

  it('deletes the key dir in a final if: always() step', () => {
    const last = all[all.length - 1];
    expect(last.text).toMatch(/if: always\(\)/);
    expect(last.text).toContain('rm -rf "$RUNNER_TEMP/asc"');
  });

  it('only publishes commits that are in origin/feat/galpao or origin/main, failing fast', () => {
    const gate = find(/branch -r --contains/);
    expect(gate.text).toContain('git fetch origin feat/galpao main');
    expect(gate.text).toContain('GITHUB_SHA');
    expect(gate.text).toMatch(/origin\/\(feat\/galpao\|main\)/);
    expect(gate.text).toMatch(/exit 1/);
    // runs before anything that needs secrets or toolchains
    expect(gate.index).toBeLessThan(find(/setup-xcode/).index);
    expect(gate.index).toBeLessThan(find(/flutter pub get/).index);
    // checkout must carry history so --contains can see ancestry
    expect(find(/actions\/checkout/).text).toContain('fetch-depth: 0');
    expect(find(/actions\/checkout/).index).toBeLessThan(gate.index);
  });

  it('installs dependencies from the lockfile', () => {
    expect(yml).toContain('flutter pub get --enforce-lockfile');
    expect(yml).not.toMatch(/flutter pub get\s*$/m);
  });

  it('pins every action to a full commit SHA with a version comment', () => {
    const uses = lines.filter((l) => /^\s*- uses:|^\s+uses:/.test(l));
    expect(uses.length).toBeGreaterThanOrEqual(3);
    for (const l of uses) expect(l).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+/);
  });
});
