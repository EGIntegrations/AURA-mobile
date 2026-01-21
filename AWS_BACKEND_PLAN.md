# AURA AWS Backend Architecture Plan

## Overview
Scalable, cost-effective AWS backend to support the AURA autism therapy app with OpenAI API integration.

## Core Architecture

### 1. API Gateway + Lambda (Serverless)
**Why**: Pay-per-use, auto-scaling, no server management
- **API Gateway**: Handle all iOS app requests
- **Lambda Functions**: Process OpenAI API calls, business logic
- **Cost**: ~$0.20 per 1M requests + compute time

### 2. Data Storage
- **DynamoDB**: User progress, session data, conversation logs
  - Fast, scalable NoSQL
  - Pay-per-use ($0.25 per GB)
- **S3**: Generated images, audio files, backups
  - $0.023 per GB storage
  - CloudFront CDN for global delivery

### 3. Authentication & Security
- **AWS Cognito**: User authentication, multi-user management
  - Free for first 50,000 users
  - HIPAA compliant option available
- **API Keys**: Secure OpenAI and ElevenLabs API storage
- **VPC**: Network isolation for sensitive data

## Service Functions

### Lambda Functions Structure
```
├── user-auth/                 # Login, registration, user management
├── curriculum-generator/      # Dynamic curriculum with OpenAI
├── image-generator/          # DALL-E image generation & caching
├── conversation-processor/   # Real-time chat with GPT-5-nano
├── emotion-analyzer/         # Vision API emotion recognition
├── progress-tracker/         # User progress analytics
├── voice-synthesizer/        # ElevenLabs TTS integration
└── admin-dashboard/          # Teacher/parent management tools
```

### API Endpoints
```
POST /auth/login
POST /auth/register
GET  /curriculum/{userId}
POST /curriculum/adapt
POST /images/generate
POST /images/analyze-emotion
POST /conversation/start
POST /conversation/message
GET  /progress/{userId}
POST /admin/students
```

## Cost Optimization Strategies

### 1. Caching Layer
- **ElastiCache/Redis**: Cache generated images, common responses
- **S3 + CloudFront**: Cache static content globally
- **Lambda@Edge**: Process requests at edge locations

### 2. API Rate Limiting
- Implement intelligent rate limiting for OpenAI calls
- Batch image generation requests
- Cache conversation responses for common scenarios

### 3. Resource Optimization
- **Lambda Provisioned Concurrency**: For real-time features
- **DynamoDB On-Demand**: Scale automatically
- **S3 Intelligent Tiering**: Auto-move old data to cheaper storage

## Security & Compliance

### Data Protection
- **Encryption at rest**: All DynamoDB and S3 data
- **Encryption in transit**: HTTPS/TLS everywhere
- **HIPAA Compliance**: Enable for healthcare settings
- **COPPA Compliance**: Special handling for children's data

### API Security
- **API Gateway Throttling**: Prevent abuse
- **WAF**: Web Application Firewall
- **Secrets Manager**: Secure API key storage
- **IAM Roles**: Principle of least privilege

## Deployment Pipeline

### Infrastructure as Code
```yaml
# terraform/main.tf
resource "aws_lambda_function" "curriculum_generator" {
  function_name = "aura-curriculum-generator"
  runtime      = "python3.9"
  handler      = "lambda_function.lambda_handler"
  
  environment {
    variables = {
      OPENAI_API_KEY = data.aws_secretsmanager_secret_version.openai.secret_string
      DYNAMODB_TABLE = aws_dynamodb_table.user_progress.name
    }
  }
}
```

### CI/CD Pipeline
1. **GitHub Actions**: Auto-deploy on push
2. **AWS SAM**: Serverless application deployment
3. **CloudFormation**: Infrastructure provisioning
4. **CodePipeline**: Production deployment pipeline

## Monitoring & Analytics

### Application Monitoring
- **CloudWatch**: Logs, metrics, alerts
- **X-Ray**: Distributed tracing
- **Custom Metrics**: User engagement, API usage

### Business Analytics
- **QuickSight**: Admin dashboards for therapists
- **Kinesis**: Real-time data streaming
- **Glue**: Data transformation for analytics

## Cost Estimation (Monthly)

### Small Scale (100 active users)
- **Lambda**: ~$5
- **DynamoDB**: ~$2
- **S3 + CloudFront**: ~$3
- **API Gateway**: ~$1
- **Cognito**: Free
- **Total AWS**: ~$11/month
- **OpenAI APIs**: ~$50-100/month
- **ElevenLabs**: ~$30/month

### Medium Scale (1,000 active users)
- **Lambda**: ~$25
- **DynamoDB**: ~$15
- **S3 + CloudFront**: ~$20
- **API Gateway**: ~$8
- **ElastiCache**: ~$15
- **Total AWS**: ~$83/month
- **OpenAI APIs**: ~$300-500/month
- **ElevenLabs**: ~$200/month

## Implementation Steps

### Phase 1: Basic Backend (Week 1-2)
1. Set up AWS account and IAM roles
2. Deploy Lambda functions for core APIs
3. Set up DynamoDB for user data
4. Implement basic authentication

### Phase 2: OpenAI Integration (Week 3)
1. Secure API key management
2. Implement curriculum generation
3. Set up image generation pipeline
4. Add conversation processing

### Phase 3: Advanced Features (Week 4)
1. Real-time conversation support
2. Voice synthesis integration
3. Emotion recognition pipeline
4. Progress analytics

### Phase 4: Production Ready (Week 5-6)
1. Security hardening
2. Performance optimization
3. Monitoring and alerts
4. Documentation and training

## Environment Variables Needed
```bash
# Store in AWS Secrets Manager
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
JWT_SECRET=...
DATABASE_URL=...
S3_BUCKET_NAME=aura-app-storage
CLOUDFRONT_DOMAIN=...
```

## Benefits of This Architecture
- ✅ **Scalable**: Auto-scales from 10 to 10,000 users
- ✅ **Cost-Effective**: Pay only for what you use
- ✅ **Secure**: Enterprise-grade security
- ✅ **Fast**: Global CDN delivery
- ✅ **Reliable**: 99.9% uptime SLA
- ✅ **Compliant**: HIPAA/COPPA ready

## Next Steps
1. Set up AWS account
2. Get API keys (OpenAI, ElevenLabs)
3. Deploy infrastructure using Terraform
4. Update iOS app with backend endpoints
5. Test end-to-end functionality