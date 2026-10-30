import { describe, expect, it } from 'vitest';
import { STRINGS } from '../config/strings.ts';
import { describeCloudStatus } from './cloudStatus.ts';

describe('estado de la nube en el popup de la cuenta', () => {
  it('dice hace cuánto se subió', () => {
    expect(describeCloudStatus({ savedAt: 1_000, failing: false, takenOver: false }, 1_000 + 3 * 60_000)).toBe(
      STRINGS.account.cloudSaved('3 min'),
    );
    expect(describeCloudStatus({ savedAt: 1_000, failing: false, takenOver: false }, 5_000)).toBe(
      STRINGS.account.cloudSaved('menos de 1 min'),
    );
  });

  it('antes de la primera subida, y sin conexión', () => {
    expect(describeCloudStatus({ savedAt: null, failing: false, takenOver: false }, 0)).toBe(STRINGS.account.cloudPending);
    expect(describeCloudStatus({ savedAt: 1_000, failing: true, takenOver: false }, 0)).toBe(STRINGS.account.cloudFailing);
  });
});
