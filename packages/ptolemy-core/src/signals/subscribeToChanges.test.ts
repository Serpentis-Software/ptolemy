import { $mutable } from './$mutable.js';
import { subscribeToChanges } from './subscribeToChanges.js';

it('subscribeToChanges', () => {
    const signal = $mutable(1);

    let calls = 0,
        cleanups = 0;

    const cleanup = subscribeToChanges([signal], ([_value]) => {
        calls += 1;
        return () => {
            cleanups += 1;
        };
    });

    expect(calls).toStrictEqual(0);
    expect(cleanups).toStrictEqual(0);

    signal.value += 1;

    expect(calls).toStrictEqual(1);
    expect(cleanups).toStrictEqual(0);

    cleanup();

    expect(calls).toStrictEqual(1);
    expect(cleanups).toStrictEqual(1);
});
