import configuration from '../src/config/configuration';

function test(name: string, env: any, expected: any) {
    const originalEnv = process.env;
    process.env = { ...originalEnv, ...env };
    const config = configuration();
    const actual = config.security.corsOrigin;
    process.env = originalEnv;

    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`PASS: ${name}`);
    } else {
        console.error(`FAIL: ${name}`);
        console.error(`  Expected: ${JSON.stringify(expected)}`);
        console.error(`  Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    }
}

console.log('Verifying CORS configuration logic...');

test('Default (no env vars)', {}, true);
test('CORS_ORIGIN=*', { CORS_ORIGIN: '*' }, true);
test('CORS_ORIGIN=true', { CORS_ORIGIN: 'true' }, true);
test('ALLOW_ORIGINS=*', { ALLOW_ORIGINS: '*' }, true);
test('Specific origins', { CORS_ORIGIN: 'http://a.com,http://b.com' }, ['http://a.com', 'http://b.com']);
test('Fallback to ALLOW_ORIGINS', { ALLOW_ORIGINS: 'http://c.com' }, ['http://c.com']);

console.log('All tests passed!');
