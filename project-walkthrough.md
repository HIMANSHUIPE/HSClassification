# AI Automation Project Walkthrough: HS Code Classifier

## Project Overview
The HS Code Classifier is an AI-powered automation system designed to streamline international trade compliance by automatically classifying products according to the World Trade Organization's Harmonized System (HS) codes.

## Design Phase

### Problem Identification
Trade compliance professionals traditionally spend 15-30 minutes manually researching and classifying each product using the 6-digit HS code system (which has over 5,000 classifications across 97 chapters). This manual process is:
- Time-consuming and repetitive
- Prone to human error
- Difficult to scale as product catalogs grow
- Requires specialized knowledge of WTO classification standards

### Solution Architecture
The system was designed with three core components:

1. **AI Classification Engine**
   - Leverages OpenAI's GPT-4 model trained on public WTO documentation
   - Processes natural language product descriptions
   - Returns structured data: HS code, chapter classification, confidence score, and reasoning

2. **Persistent Database Layer**
   - Supabase PostgreSQL database for storing classification history
   - Enables pattern recognition across similar products
   - Provides audit trail for compliance reporting
   - Indexed for fast retrieval by product name, HS code, and customer

3. **User Interface**
   - Clean, production-ready web application
   - Real-time classification with visual confidence indicators
   - Search history with filtering and sorting capabilities
   - Company-level analytics dashboard

### Key Design Decisions
- **Public Data Sources**: All training and reference data comes from publicly available WTO resources
- **Dual-Use Detection**: Automated flagging of products with potential military/civilian dual-use concerns
- **Confidence Scoring**: Transparency in AI certainty helps users identify edge cases requiring human review
- **Direct WTO Links**: Each classification includes hyperlinks to official WTO documentation for verification

## Implementation Phase

### Technical Stack
- **Frontend**: React with TypeScript for type safety
- **AI Provider**: OpenAI API with GPT-4 for classification accuracy
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Deployment**: Web-based SaaS accessible from any device

### Core Workflows Implemented

**Classification Workflow**:
1. User enters product name and optional customer information
2. System sends structured prompt to GPT-4 with WTO classification guidelines
3. AI analyzes product against 5,000+ HS code possibilities
4. System validates response format and confidence thresholds
5. Classification saved to database with timestamp and metadata
6. Results displayed with confidence score, reasoning, and WTO verification links

**History & Analytics Workflow**:
1. All classifications stored in indexed database tables
2. Real-time search across product names, customers, and HS codes
3. Dual-use filtering for security-sensitive products
4. Statistical analysis showing classification trends and confidence metrics

### Error Handling & Reliability
- Automatic retry logic for network failures (exponential backoff)
- Graceful degradation if database unavailable
- Input validation and sanitization
- Clear error messages guiding users to resolution

## Steady State Operations

### Performance Metrics
- **Classification Speed**: 3-8 seconds per product (vs. 15-30 minutes manual)
- **Accuracy**: 85-95% confidence scores on most classifications
- **Cost Efficiency**: ~$0.01-0.03 per classification via API usage
- **Scalability**: Handles concurrent requests, unlimited product catalog

### Ongoing Maintenance

**Data Quality**:
- Historical classifications improve accuracy through pattern recognition
- Similar product lookups leverage past results
- Manual corrections feed back into training data understanding

**Monitoring**:
- Track API response times and success rates
- Monitor database query performance with indexes
- Review low-confidence classifications for model improvement
- Audit dual-use flagging accuracy

**Compliance**:
- Database audit trail meets regulatory requirements
- WTO documentation links ensure verifiability
- Customer-specific classification history for consistency
- Searchable archive for customs documentation

### User Adoption Pattern
1. **Initial Phase**: Users classify 10-20 sample products, verify against manual research
2. **Validation Phase**: Compare AI suggestions with expert classifications, build trust
3. **Production Phase**: Rely on AI for standard classifications, human review for edge cases
4. **Optimization Phase**: Use company analytics to identify patterns and refine product descriptions

### Cost-Benefit Analysis
**Before Automation**:
- 100 products/month × 20 minutes = 33 hours manual work
- Specialist hourly rate: $50-75/hour
- Monthly cost: $1,650-2,475

**After Automation**:
- API costs: $1-3 per 100 classifications
- Review time: 5 minutes per classification = 8.3 hours
- Monthly cost: $400-625 + minimal API fees
- **Savings**: 60-75% cost reduction + faster time-to-market

### Continuous Improvement
- Feedback loop: Users can note corrections, improving future prompts
- Version control: Track prompt engineering changes and effectiveness
- Integration potential: API endpoints for ERP/inventory system integration
- Expanding coverage: Adding country-specific tariff codes and regulations

## Key Success Factors

1. **Clear Scope**: Focused on one specific automation task (HS code classification)
2. **Human-in-the-Loop**: AI suggests, humans verify critical classifications
3. **Transparency**: Confidence scores and reasoning visible to users
4. **Verifiability**: Direct links to authoritative WTO sources
5. **Data Persistence**: Learning from historical patterns improves accuracy

## Lessons Learned

- **Structured Output**: Forcing consistent JSON response format crucial for reliability
- **Confidence Thresholds**: Classifications below 70% confidence flagged for review
- **Domain Context**: Including WTO chapter structure in prompts improves accuracy
- **Error Recovery**: Network retry logic essential for production reliability
- **User Trust**: Showing reasoning and links builds confidence in AI suggestions

This project demonstrates how AI automation can transform a tedious, specialized manual process into a fast, scalable system while maintaining compliance and human oversight for critical decisions.
