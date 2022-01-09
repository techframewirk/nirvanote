### Nirvanote 

The following env variables need to be defined
- AWS_ACCESS_KEY_ID => Credentials from AWS IAM for Programmatic Access
- AWS_SECRET_ACCESS_KEY => Credentials from AWS IAM for Programmatic Access
- PORT => Port to run the server on
- S3_URL_EXPIRY => Expiry time for the S3 URL
- MONGOURL => URL to connect to MongoDB
- S3_REGION => AWS Region for S3
- S3_BUCKET => Bucket name for S3
- WHATSAPP_URL => URL to connect to WhatsApp
- WHATSAPP_ADMIN_USERNAME => WhatsApp Admin Username
- WHATSAPP_ADMIN_PASSWORD => WhatsApp Admin Password
- WHATSAPP_WEBHOOK_SECRET => WhatsApp Webhook Secret
- HOST => Hostname for the server
- GOOGLE_APPLICATION_CREDENTIALS => Path to Google Cloud Service Account JSON
- REDIS => Redis URL
- S3_STORE_BUCKET => Bucket name for S3 storage
- pageSize => Number of notes to be displayed per page

##### Requirements to run the server

- Docker
- Docker Compose

##### Steps to Run the server

```
docker-compose up -d
```

##### For API Documentation refer to Nirvanote.json