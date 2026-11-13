const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createInquiryHandler } = require('../src/inquiry');
const valid = { firstName: 'Ada', lastName: 'Lovelace', phone: '+39 12345', email: 'ada@example.com', company: 'Example', services: ['Speakers Bureau'], message: 'Hello\nWorld', newsletter: false, language: 'it', honey: '' };
const env = { COMMUNICATION_SERVICES_CONNECTION_STRING: 'secret', SENDER_EMAIL_ADDRESS: 'sender@example.com', DESTINATION_EMAIL_ADDRESS: 'inbox@example.com' };
function setup(status = 'Succeeded', settings = env) {
    const sent = [];
    const handler = createInquiryHandler({ env: settings, createClient: () => ({ beginSend: async mail => {
        sent.push(mail);
        if (status === 'throw') throw new Error('secret provider details');
        return { pollUntilDone: async () => ({ status }) };
    } }) });
    return { sent, call: (body, type = 'application/json') => handler(new Request('https://example.com/api/send-email', { method: 'POST', headers: { 'content-type': type }, body: typeof body === 'string' ? body : JSON.stringify(body) }), { error() {} }) };
}
test('sends all fields to configured recipient with visitor Reply-To', async () => {
    const { call, sent } = setup();
    assert.equal((await call({ ...valid, destination: 'attacker@example.com' })).jsonBody.success, true);
    assert.equal(sent[0].recipients.to[0].address, env.DESTINATION_EMAIL_ADDRESS);
    assert.equal(sent[0].replyTo[0].address, valid.email);
    for (const text of ['Ada Lovelace', 'Example', '+39 12345', 'Speakers Bureau', 'Hello\nWorld', 'Newsletter opt-in: No', 'Site language: it']) assert.ok(sent[0].content.plainText.includes(text));
});
test('rejects malformed input without contacting ACS', async () => {
    const { call, sent } = setup();
    for (const body of ['{', null, [], { ...valid, firstName: '' }, { ...valid, email: 'bad' }, { ...valid, firstName: 'a\nb' }, { ...valid, newsletter: 'false' }, { ...valid, services: ['unknown'] }, { ...valid, message: 'x'.repeat(5001) }]) assert.equal((await call(body)).status, 400);
    assert.equal((await call('x'.repeat(17000))).status, 413);
    assert.equal((await call(valid, 'text/plain')).status, 415);
    assert.equal(sent.length, 0);
});
test('honeypot never sends', async () => {
    const { call, sent } = setup();
    assert.equal((await call({ ...valid, honey: 'bot' })).status, 200);
    assert.equal(sent.length, 0);
});
test('missing configuration fails without sending', async () => {
    const { call, sent } = setup('Succeeded', {});
    assert.equal((await call(valid)).status, 503);
    assert.equal(sent.length, 0);
});
test('failed or incomplete ACS sends never return success or provider details', async () => {
    for (const status of ['Failed', 'Running', 'throw']) {
        const result = await setup(status).call(valid);
        assert.equal(result.status, 502);
        assert.equal(result.jsonBody.success, false);
        assert.ok(!JSON.stringify(result).includes('secret'));
    }
});
