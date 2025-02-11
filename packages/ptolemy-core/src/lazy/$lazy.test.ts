import { $lazy } from './$lazy.js';

it('general', async () => {
    const release = new AbortController();

    const lazy = $lazy(
        () =>
            new Promise((resolve) => {
                release.signal.addEventListener('abort', () => {
                    resolve(1);
                });
            }),
    );

    expect(lazy.state).toStrictEqual('INITIAL');

    // Causes the promise to kick off
    lazy.ensure();

    expect(lazy.state).toStrictEqual('LOADING');

    release.abort();

    await new Promise((resolve) => queueMicrotask(() => resolve(void 0)));

    expect(lazy.state).toStrictEqual('SUCCESS');

    expect(lazy.getResult()).toStrictEqual(1);

    await expect(lazy.promise).resolves.toStrictEqual(1);
});

it('error', async () => {
    const release = new AbortController();

    const lazy = $lazy(
        () =>
            new Promise((_resolve, reject) => {
                release.signal.addEventListener('abort', () => {
                    reject(new Error('FAILED'));
                });
            }),
    );

    expect(lazy.state).toStrictEqual('INITIAL');

    // Causes the promise to kick off
    lazy.ensure();

    expect(lazy.state).toStrictEqual('LOADING');

    release.abort();

    // wait for .then to complete
    await new Promise((resolve) =>
        globalThis.setTimeout(() => resolve(void 0), 1000),
    );

    expect(lazy.state).toStrictEqual('ERROR');

    expect(lazy.getError()).toHaveProperty('message', 'FAILED');

    await expect(lazy.promise).rejects.toHaveProperty('message', 'FAILED');
});
