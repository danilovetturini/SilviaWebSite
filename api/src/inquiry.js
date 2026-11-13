const SERVICES = new Set([
    'AI, Security & Privacy Consultancy', 'Speakers Bureau',
    'Cross-Border Legacy, Law & Philanthropy', 'Global Youth Ambassadors',
]);
const isEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const reply = (status, jsonBody) => ({ status, headers: { 'Cache-Control': 'no-store' }, jsonBody });

function createInquiryHandler({ createClient, env = process.env }) {
    return async (request, context) => {
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            return reply(415, { success: false, error: 'JSON required.' });
        }
        let body;
        try {
            const raw = await request.text();
            if (Buffer.byteLength(raw, 'utf8') > 16384) return reply(413, { success: false, error: 'Request too large.' });
            body = JSON.parse(raw);
        } catch {
            return reply(400, { success: false, error: 'Invalid JSON.' });
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { success: false, error: 'Invalid request.' });
        // Honeypot: acknowledge automated submissions without sending mail.
        if (body.honey) return reply(200, { success: true });
        const limits = { firstName: 100, lastName: 100, company: 200, phone: 50, email: 254, message: 5000 };
        const data = {};
        for (const [field, limit] of Object.entries(limits)) {
            const value = body[field] ?? '';
            if (typeof value !== 'string' || value.length > limit || (field !== 'message' && /[\r\n\x00-\x1f]/.test(value))) {
                return reply(400, { success: false, error: 'Invalid fields.' });
            }
            data[field] = value.trim();
        }
        if (!data.firstName || !data.lastName || !data.phone || !isEmail(data.email)
            || !Array.isArray(body.services) || body.services.length > SERVICES.size
            || body.services.some(service => !SERVICES.has(service))
            || typeof body.newsletter !== 'boolean' || !['en', 'it'].includes(body.language)) {
            return reply(400, { success: false, error: 'Invalid fields.' });
        }
        const connection = env.COMMUNICATION_SERVICES_CONNECTION_STRING;
        const sender = env.SENDER_EMAIL_ADDRESS;
        const destination = env.DESTINATION_EMAIL_ADDRESS;
        if (!connection || !isEmail(sender) || !isEmail(destination)) {
            context.error('Inquiry email configuration missing or invalid.');
            return reply(503, { success: false, error: 'Email service unavailable.' });
        }
        try {
            const client = createClient(connection);
            const poller = await client.beginSend({
                senderAddress: sender,
                recipients: { to: [{ address: destination }] },
                replyTo: [{ address: data.email, displayName: `${data.firstName} ${data.lastName}` }],
                content: {
                    subject: `Purpose Bridge — New inquiry from ${data.firstName} ${data.lastName}`,
                    plainText: [
                        'New service inquiry — Purpose Bridge', '',
                        `Name: ${data.firstName} ${data.lastName}`, `Company: ${data.company || 'Not specified'}`,
                        `Phone: ${data.phone}`, `Email: ${data.email}`,
                        `Practices: ${[...new Set(body.services)].join(', ') || 'Not specified'}`,
                        `Newsletter opt-in: ${body.newsletter ? 'Yes' : 'No'}`,
                        `Site language: ${body.language}`, '', 'Message:', data.message || 'No message provided.',
                    ].join('\n'),
                },
            });
            const result = await poller.pollUntilDone();
            if (result.status !== 'Succeeded') throw new Error('Email send failed');
            return reply(200, { success: true });
        } catch {
            // Never log provider responses, credentials or personal data.
            context.error('ACS inquiry send failed.');
            return reply(502, { success: false, error: 'Unable to send inquiry.' });
        }
    };
}
module.exports = { createInquiryHandler };
