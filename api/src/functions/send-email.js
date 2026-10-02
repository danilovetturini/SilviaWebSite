const { app } = require('@azure/functions');
const { EmailClient } = require("@azure/communication-email");

app.http('send-email', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { firstName, lastName, company, phone, email, services, message, newsletter } = body;

            const servicesList = Array.isArray(services) ? services.join(', ') : (services || 'None');
            
            const plainTextContent = `
New Service Inquiry from SilviaWebSite:
                
Name: ${firstName} ${lastName}
Company: ${company || 'N/A'}
Phone: ${phone}
Email: ${email}
                
Interested in: ${servicesList}
Newsletter Opt-in: ${newsletter ? 'Yes' : 'No'}
                
Message:
${message || 'No message provided.'}
            `;

            const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING; 
            if (!connectionString) {
                return { status: 500, jsonBody: { error: "Missing ACS connection string." } };
            }

            const client = new EmailClient(connectionString);

            // TODO: Update senderAddress to your verified domain and recipient to your email
            const emailMessage = {
                senderAddress: process.env.SENDER_EMAIL_ADDRESS || "donotreply@YOUR_VERIFIED_DOMAIN.com",
                content: {
                    subject: `New Inquiry from ${firstName} ${lastName}`,
                    plainText: plainTextContent,
                },
                recipients: {
                    to: [{ address: process.env.DESTINATION_EMAIL_ADDRESS || "YOUR_DESTINATION_EMAIL@example.com" }],
                },
            };

            const poller = await client.beginSend(emailMessage);
            await poller.pollUntilDone();

            return { status: 200, jsonBody: { message: "Email sent successfully" } };
        } catch (error) {
            context.error("Error sending email:", error);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});
