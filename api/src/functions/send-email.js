const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');
const { createInquiryHandler } = require('../inquiry');
app.http('send-email', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: createInquiryHandler({ createClient: connection => new EmailClient(connection) }),
});
