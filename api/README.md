# Invio richieste con Azure Communication Services

Il form chiama `POST /api/send-email`. La funzione invia un'email in testo semplice
al destinatario configurato sul server, con tutti i campi e il consenso newsletter.
Il Reply-To permette di rispondere direttamente al richiedente. La selezione
newsletter viene comunicata nell'email: non iscrive automaticamente a una lista.

## Configurazione Azure

1. Creare una risorsa Email Communication Services e verificare un dominio
   (oppure usare il dominio fornito da Azure).
2. Collegare quel dominio alla risorsa Azure Communication Services.
3. Nelle impostazioni applicazione della **Static Web App**, configurare:

| Nome | Valore |
| --- | --- |
| `COMMUNICATION_SERVICES_CONNECTION_STRING` | Connection string della risorsa ACS |
| `SENDER_EMAIL_ADDRESS` | Mittente autorizzato nel dominio collegato |
| `DESTINATION_EMAIL_ADDRESS` | Casella che riceve le richieste, ad esempio `info@purposebridge.it` |

Non inserire questi valori nel frontend o nel repository. Il destinatario non
può essere scelto dal visitatore. Configurare separatamente eventuali ambienti preview.
Il workflow GitHub include `api_location: "api"` per distribuire le funzioni.

## Verifica locale

Installare le dipendenze con `npm ci` nella root e `npm ci --prefix api`.
Copiare `api/local.settings.example.json` in `api/local.settings.json` (ignorato
da Git) e compilare i valori. Con Azure Functions Core Tools e Static Web Apps
CLI installati, eseguire `npm run build` e `swa start dist --api-location api`.
Aprire l'indirizzo indicato dalla CLI: il solo server Astro non esegue le API Azure.
Per lavorare sull'interfaccia usare `npm run astro -- dev --background`.

`npm --prefix api test` verifica validazione, honeypot, destinatario fisso,
Reply-To e fallimenti ACS con un client simulato; non invia email.
Il test reale richiede configurazione Azure e una richiesta dal form, verificando
la ricezione e la risposta al richiedente. Il successo ACS indica completamento
dell'operazione di invio, non garantisce il recapito nella posta in arrivo.

Il campo nascosto filtra i bot più semplici; non è un rate limiter o un CAPTCHA.
Per traffico abusivo aggiungere protezioni gestite prima dell'endpoint.

## Documentazione ufficiale

- [Inviare email con ACS](https://learn.microsoft.com/azure/communication-services/quickstarts/email/send-email?pivots=programming-language-javascript)
- [API Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/add-api)
