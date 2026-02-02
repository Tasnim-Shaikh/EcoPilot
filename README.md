# EcoPilot - AI Sustainability Platform

EcoPilot is a comprehensive web application that enables organizations to measure, optimize, and govern the environmental impact of AI usage using real APIs, explainable sustainability calculations, and strong AI governance controls.

## Features

### User Features

- **EcoChat**: Interactive chat with real-time sustainability metrics
  - Support for OpenAI GPT, Anthropic Claude, and Google Gemini models
  - Real-time CO2, energy, and water consumption tracking
  - Green Mode for optimized prompts
  - Token usage and quality scoring

- **Prompt Analytics**: Track and analyze all your AI interactions
  - Historical data with charts
  - CO2 emissions and savings tracking
  - Eco points accumulation

- **Leaderboard**: Compete with others on sustainability metrics
  - Rankings based on eco points
  - CO2 savings comparison
  - Badge achievements

- **Badges & Courses**: Gamification for sustainable AI usage
  - Unlock badges through milestones
  - Complete sustainability courses
  - Earn rewards and eco points

- **AI Recommender**: Get recommendations for efficient AI usage
  - Model efficiency comparisons
  - Region sustainability rankings
  - Hardware optimization suggestions

### Admin Features

- **Manage Access**: Department-wise AI governance controls
  - Model access restrictions
  - Token limits per department
  - Green Mode enforcement
  - Region restrictions

- **Department Analytics**: Organization-wide insights
  - Token usage by department
  - CO2 emissions tracking
  - Visual charts and reports

- **ESG Report Generation**: Automated sustainability reporting
  - Organization-wide metrics
  - Export-ready reports

### Global Features

- **Multi-language Support**: English, Hindi, Marathi
- **Dark/Light Mode**: Theme switching
- **Responsive Design**: Works on all devices

## Technology Stack

- **Frontend**: React, TailwindCSS, shadcn/ui, Recharts
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **APIs**: OpenAI, Anthropic, Google Gemini, ElectricityMap

## Setup Instructions

### Prerequisites

- Node.js 16+ and Yarn
- Python 3.10+
- MongoDB
- API Keys (see below)

### Required API Keys

#### 1. ElectricityMap API Key (Required for carbon intensity data)

Sign up at https://app.electricitymaps.com/developer-hub

```
ELECTRICITY_MAP_API_KEY=your_electricity_map_api_key_here
```

### Installation

1. **Backend Setup**

```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Frontend Setup**

```bash
cd /app/frontend
npm install
```

3. **Configure API Keys**
   Edit `/app/backend/.env` and add your API keys as shown above.

## Usage

### Default Admin Credentials

- Email: `admin@gmail.com`
- Password: `Admin@2026`

### User Registration

1. Click "Get Started" on landing page
2. Enter email and password
3. Complete signup
4. Access user dashboard

### Using EcoChat

1. Navigate to EcoChat from dashboard
2. Select LLM provider and model
3. Choose region for carbon intensity calculation
4. Enter your prompt
5. Toggle Green Mode for optimization (optional)
6. Click "Calculate Impact"
7. View real-time metrics:
   - CO2 emissions
   - Energy consumption
   - Water consumption
   - Quality score
   - Eco points earned

### Green Mode Benefits

- Automatically optimizes prompts for efficiency
- Reduces token usage
- Saves CO2 emissions
- Earns more eco points

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### EcoChat

- `POST /api/ecochat` - Send prompt and get response with metrics

### Analytics

- `GET /api/analytics/prompts` - Get user's prompt history
- `GET /api/analytics/stats` - Get user's statistics

### Leaderboard & Badges

- `GET /api/leaderboard` - Get leaderboard
- `GET /api/badges` - Get available badges
- `GET /api/courses` - Get sustainability courses

### AI Recommender

- `GET /api/recommender/models` - Get model recommendations
- `GET /api/recommender/regions` - Get region recommendations

### Admin (Admin only)

- `GET /api/admin/departments` - Get all departments
- `PUT /api/admin/departments/{id}` - Update department access
- `GET /api/admin/analytics/departments` - Get department analytics
- `POST /api/admin/esg-report` - Generate ESG report

## Sustainability Calculations

### Energy Consumption

Energy (kWh) = Tokens × Energy_Per_Token
Default: 0.00001 kWh per token

### CO2 Emissions

CO2 (grams) = Energy (kWh) × Carbon_Intensity (gCO2/kWh)
Carbon intensity fetched from ElectricityMap API based on selected region.

### Water Consumption

Water (liters) = Energy (kWh) × Water_Intensity_Factor
Default: 0.05 liters per kWh

### Quality Score

Calculated based on response completeness and coherence (0.0 to 1.0 scale).

### Eco Points

- CO2 saved = original CO2 − new CO2
- Green Mode: CO2_Saved × 10

### Model Efficiency Score

- CO2 per token = total CO2 / total tokens
- Then converted into percentage

### Region sustainability score

- Score = (1 − carbon_intensity / max_value) × 100
- max_value is the most dirty carbon intensity

## Troubleshooting

### API Key Errors

If you see "API key not configured" errors:

1. Check `/app/backend/.env` file
2. Ensure API keys are not placeholder values (e.g., "your_openai_api_key_here")
3. Restart backend: `sudo supervisorctl restart backend`

### ElectricityMap API

If carbon intensity shows default values (400 gCO2/kWh):

- Verify your ElectricityMap API key is valid
- Check if you've exceeded API quota
- Default fallback value is used when API is unavailable

### MongoDB Connection

If database errors occur:

- Ensure MongoDB is running: `sudo supervisorctl status mongodb`
- Check connection string in `/app/backend/.env`

## Support

For issues or questions, please check the application logs:

```bash
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```
