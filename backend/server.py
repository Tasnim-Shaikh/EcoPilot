from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
import httpx
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
ACCESS_TOKEN_EXPIRE = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))

# Constants
ENERGY_PER_TOKEN = float(os.getenv("ENERGY_PER_TOKEN", 0.00001))
WATER_INTENSITY_FACTOR = float(os.getenv("WATER_INTENSITY_FACTOR", 0.05))

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
REGION_CARBON_INTENSITY = {
    "US-CAL-CISO": 300,   # cleaner grid
    "FR": 70,       # nuclear-heavy
    "SE": 40,       # hydro/wind
    "US-NY-NYIS": 450, # fossil-heavy
    "DE": 500       # coal/gas mix
}
REGION_MAP = {
    "US-CA": "US-CAL-CISO",
    "US-EAST": "US-NY-NYIS",
    "US-CAL-CISO": "US-CAL-CISO",
    "US-NY-NYIS": "US-NY-NYIS",
    "FR": "FR",
    "DE": "DE",
    "SE": "SE",
}

# ==================== MODELS ====================
class CountTokensRequest(BaseModel):
    prompt: str
    llm_model: str
    llm_provider: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"
    department: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    eco_points: int = 0
    co2_saved: float = 0.0
    badges: List[str] = []
    created_at: datetime

class EcoChatRequest(BaseModel):
    prompt: str  # User-entered prompt (required)
    llm_model: str
    llm_provider: str
    region: str
    hardware: str = "GPU"
    green_mode: bool = False

class EstimateRequest(BaseModel):
    prompt: str
    model: str
    region: str = "US-CAL-CISO"

class EcoChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    response_text: str
    tokens_used: int
    energy_kwh: float
    co2_grams: float
    water_liters: float
    quality_score: float
    eco_points: int
    green_mode_used: bool
    auto_switched: bool = False
    suggestion: Optional[Dict[str, Any]] = None
    savings: Optional[Dict[str, float]] = None
    timestamp: datetime

class PromptAnalytics(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    prompt: str
    model: str
    tokens_used: int
    energy_kwh: float
    co2_grams: float
    co2_saved: float
    water_liters: float
    eco_points: int
    timestamp: datetime
    green_mode_used: Optional[bool] = False
    auto_switched: Optional[bool] = False


class Badge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    icon: str
    criteria: str
    unlocked: bool = False

class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    status: str  # locked, ongoing, completed
    eco_points_reward: int
    badge_reward: Optional[str] = None

class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    eco_points: int
    co2_saved: float
    badges_count: int
    rank: int

class DepartmentAccess(BaseModel):
    id: str
    department: str

    allowed_providers: Dict[str, List[str]] = Field(
        default_factory=lambda: {
            "openai": [],
            "anthropic": [],
            "gemini": []
        }
    )

    allowed_regions: List[str] = Field(default_factory=list)
    token_limit: int = 10000
    green_mode_enforced: bool = False


class DepartmentAnalytics(BaseModel):
    department: str
    token_usage: int
    co2_emissions: float
    co2_saved: float

# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Handle admin user specially
        if user_id == "admin":
            admin_email = os.getenv("ADMIN_EMAIL")
            return User(
                id="admin",
                email=admin_email,
                role="admin",
                department="Administration",
                eco_points=0,
                co2_saved=0.0,
                badges=[],
                created_at=datetime.now(timezone.utc)
            )
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def calculate_co2_with_climateq(energy_kwh: float, region: str = "US-CAL-CISO") -> dict:
    """Calculate CO2 emissions using ClimateQ API"""
    api_key = os.getenv("CLIMATEQ_API_KEY")
    
    if not api_key:
        logger.warning("ClimateQ API key not configured, using fallback")
        carbon_intensity = await get_carbon_intensity(region)
        co2_kg = energy_kwh * carbon_intensity / 1000  # Convert to kg
        return {
            "co2e": co2_kg,
            "co2e_unit": "kg",
            "method": "electricitymap_fallback",
            "carbon_intensity": carbon_intensity
        }
    
    try:
        # Map regions to ClimateQ activity IDs
        region_activity_map = {
            "US-CAL-CISO": "electricity-supply_grid-source_residual_mix",
            "US-NY-NYIS": "electricity-supply_grid-source_residual_mix",
            "FR": "electricity-supply_grid-source_residual_mix",
            "SE": "electricity-supply_grid-source_residual_mix",
            "DE": "electricity-supply_grid-source_residual_mix",
        }

        
        activity_id = region_activity_map.get(region, "electricity-supply_grid-source_residual_mix")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.climatiq.io/data/v1/estimate",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "emission_factor": {
                        "activity_id": activity_id,
                        "data_version": "^21"
                    },
                    "parameters": {
                        "energy": energy_kwh,
                        "energy_unit": "kWh"
                    }
                },
                timeout=15.0
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"ClimateQ response: {data}")
                return {
                    "co2e": data.get("co2e", 0),  # in kg
                    "co2e_unit": data.get("co2e_unit", "kg"),
                    "method": "climatiq",
                    "emission_factor": data.get("emission_factor", {}).get("name", "Unknown"),
                    "region": data.get("emission_factor", {}).get("region", region)
                }
            else:
                logger.warning(f"ClimateQ API error: {response.status_code} - {response.text}")
                # Fallback to ElectricityMap
                carbon_intensity = await get_carbon_intensity(region)
                co2_kg = energy_kwh * carbon_intensity / 1000
                return {
                    "co2e": co2_kg,
                    "co2e_unit": "kg",
                    "method": "electricitymap_fallback",
                    "carbon_intensity": carbon_intensity
                }
    except Exception as e:
        logger.error(f"Error calling ClimateQ API: {e}")
        # Fallback to ElectricityMap
        carbon_intensity = await get_carbon_intensity(region)
        co2_kg = energy_kwh * carbon_intensity / 1000
        return {
            "co2e": co2_kg,
            "co2e_unit": "kg",
            "method": "electricitymap_fallback",
            "carbon_intensity": carbon_intensity
        }

async def get_carbon_intensity(region: str) -> float:
    """Fetch carbon intensity from electricityMap API"""
    api_key = os.getenv("ELECTRICITY_MAP_API_KEY")
    if not api_key or api_key == "your_electricity_map_api_key_here":
        logger.warning("ElectricityMap API key not configured, using default value")
        return 400.0  # Default gCO2eq/kWh
    
    try:
        zone = REGION_MAP.get(region, region)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.electricitymap.org/v3/carbon-intensity/latest",
                params={"zone": zone},
                headers={"auth-token": api_key},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("carbonIntensity", 400.0)
            else:
                logger.warning(f"ElectricityMap API error: {response.status_code}")
                return 400.0
    except Exception as e:
        logger.error(f"Error fetching carbon intensity: {e}")
        return 400.0

async def get_climateq_impact(model_name: str, region: str, prompt: str) -> dict:
    """Fetch carbon impact from ClimateQ API using model name and region"""
    api_key = os.getenv("CLIMATEQ_API_KEY")
    
    if not api_key:
        # Fallback to estimation
        word_count = len(prompt.split())
        estimated_tokens = int(word_count * 1.5)
        carbon_intensity = await get_carbon_intensity(region)
        energy_kwh = estimated_tokens * ENERGY_PER_TOKEN
        co2_grams = energy_kwh * carbon_intensity
        water_liters = energy_kwh * WATER_INTENSITY_FACTOR
        
        return {
            "tokens_used": estimated_tokens,
            "energy_kwh": energy_kwh,
            "co2_grams": co2_grams,
            "water_liters": water_liters,
            "source": "estimated"
        }
    
    try:
        async with httpx.AsyncClient() as client:
            # ClimateQ API call with model name and region
            response = await client.post(
                "https://api.climateq.io/v1/calculate",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "region": region,
                    "prompt": prompt
                },
                timeout=15.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "tokens_used": data.get("tokens", len(prompt.split()) * 1.5),
                    "energy_kwh": data.get("energy_kwh", 0),
                    "co2_grams": data.get("co2_grams", 0),
                    "water_liters": data.get("water_liters", 0),
                    "source": "climateq"
                }
            else:
                logger.warning(f"ClimateQ API error: {response.status_code}")
                # Fallback
                word_count = len(prompt.split())
                estimated_tokens = int(word_count * 1.5)
                carbon_intensity = await get_carbon_intensity(region)
                energy_kwh = estimated_tokens * ENERGY_PER_TOKEN
                co2_grams = energy_kwh * carbon_intensity
                water_liters = energy_kwh * WATER_INTENSITY_FACTOR
                
                return {
                    "tokens_used": estimated_tokens,
                    "energy_kwh": energy_kwh,
                    "co2_grams": co2_grams,
                    "water_liters": water_liters,
                    "source": "fallback"
                }
    except Exception as e:
        logger.error(f"Error calling ClimateQ API: {e}")
        # Fallback calculation
        word_count = len(prompt.split())
        estimated_tokens = int(word_count * 1.5)
        carbon_intensity = await get_carbon_intensity(region)
        energy_kwh = estimated_tokens * ENERGY_PER_TOKEN
        co2_grams = energy_kwh * carbon_intensity
        water_liters = energy_kwh * WATER_INTENSITY_FACTOR
        
        return {
            "tokens_used": estimated_tokens,
            "energy_kwh": energy_kwh,
            "co2_grams": co2_grams,
            "water_liters": water_liters,
            "source": "fallback"
        }

async def call_llm(prompt: str, provider: str, model: str, api_key: str) -> tuple:
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message="You are a helpful assistant."
        ).with_model(provider, model)
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Extract token usage - this depends on the actual response structure
        tokens_used = len(prompt.split()) + len(response.split())  # Approximate
        
        return response, tokens_used
    except Exception as e:
        logger.error(f"LLM call error: {e}")
        # Return a mock response if LLM fails
        mock_response = "This is a simulated response for demonstration. Configure LLM API keys for actual responses."
        tokens_used = len(prompt.split()) + len(mock_response.split())
        return mock_response, tokens_used

def calculate_quality_score(response_text: str) -> float:
    """Calculate quality score based on response"""
    # Simple heuristic: longer responses generally indicate more detailed answers
    word_count = len(response_text.split())
    if word_count < 10:
        return 0.3
    elif word_count < 50:
        return 0.6
    elif word_count < 150:
        return 0.8
    else:
        return 0.9

def optimize_prompt(prompt: str) -> str:
    """Optimize prompt for Green Mode"""
    # Simple optimization: make prompt more concise
    words = prompt.split()
    if len(words) > 50:
        return " ".join(words[:50]) + "..."
    return prompt

async def get_best_green_configuration(allowed_providers: dict, allowed_regions: list, limit: int = 500):
    if not allowed_providers or not allowed_regions:
        return None

    or_conditions = []
    for provider, models in allowed_providers.items():
        if models:
            or_conditions.append({
                "provider": provider,
                "model": {"$in": models},
                "region": {"$in": allowed_regions}
            })

    pipeline = [
        {"$match": {"$or": or_conditions}},
        {
            "$group": {
                "_id": {
                    "provider": "$provider",
                    "model": "$model",
                    "region": "$region",
                    "hardware": "$hardware",
                },
                "total_co2": {"$sum": "$co2_grams"},
                "total_tokens": {"$sum": "$tokens_used"},
            }
        },
        {
            "$project": {
                "provider": "$_id.provider",
                "model": "$_id.model",
                "region": "$_id.region",
                "hardware": "$_id.hardware",
                "co2_per_token": {
                    "$cond": [
                        {"$eq": ["$total_tokens", 0]},
                        999999,
                        {"$divide": ["$total_co2", "$total_tokens"]},
                    ]
                },
            }
        },
        {"$sort": {"co2_per_token": 1}},
        {"$limit": 1},
    ]

    result = await db.chats.aggregate(pipeline).to_list(1)
    return result[0] if result else None


# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "EcoPilot API", "version": "1.0.0"}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/signup", response_model=User)
async def signup(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "role": user_data.role,
        "department": user_data.department,
        "eco_points": 0,
        "co2_saved": 0.0,
        "badges": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_dict)
    user_dict.pop("password")
    return User(**user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Check admin credentials
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if form_data.username == admin_email and form_data.password == admin_password:
        # Admin login
        user_dict = {
            "id": "admin",
            "email": admin_email,
            "role": "admin",
            "department": "Administration",
            "eco_points": 0,
            "co2_saved": 0.0,
            "badges": [],
            "created_at": datetime.now(timezone.utc)
        }
    else:
        # Regular user login
        user = await db.users.find_one({"email": form_data.username})
        if not user or not verify_password(form_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        user_dict = user
    
    access_token = create_access_token({"sub": user_dict["id"]})
    user_dict.pop("password", None)
    user_dict.pop("_id", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }
@api_router.get("/user/department-access")
async def get_user_department_access(current_user: User = Depends(get_current_user)):
    """
    Returns department-based AI access config for logged-in user
    """
    department = current_user.department

    if not department:
        raise HTTPException(status_code=400, detail="User department not set")

    dept = await db.departments.find_one(
        {"department": department},
        {"_id": 0}
    )

    # 🔒 Fallback safety (important for demo)
    if not dept:
        return {
            "department": department,
            "allowed_providers": {
                "openai": [],
                "anthropic": [],
                "gemini": []
            },
            "allowed_regions": ["US-NY-NYIS"],
            "green_mode_enforced": True,
            "token_limit": 5000
        }

    return {
        "department": dept["department"],
        "allowed_providers": dept.get("allowed_providers", {}),
        "allowed_regions": dept.get("allowed_regions", []),
        "green_mode_enforced": dept.get("green_mode_enforced", False),
        "token_limit": dept.get("token_limit", 0)
    }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email})
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    return {"message": "Password reset instructions sent to your email"}

@api_router.get("/auth/departments")
async def get_departments_list():
    """Get list of all departments for signup"""
    departments = await db.departments.find({}, {"_id": 0, "department": 1}).to_list(100)

    default = ["Engineering", "Research", "Marketing", "Sales", "HR", "Finance"]
    db_names = [d["department"] for d in departments]

    return {"departments": list(set(db_names + default))}


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== ECOCHAT ROUTES ====================

@api_router.post("/ecochat/count-tokens")
async def count_tokens(
    request: CountTokensRequest,
    current_user: User = Depends(get_current_user)
):
    prompt = request.prompt
    llm_model = request.llm_model
    llm_provider = request.llm_provider

    """Count tokens without executing LLM - uses tokenizer only"""
    try:
        # Use tiktoken for OpenAI models
        if llm_provider == "openai":
            import tiktoken
            if "gpt-4" in llm_model.lower() or "gpt-5" in llm_model.lower():
                encoding = tiktoken.encoding_for_model("gpt-4")
            else:
                encoding = tiktoken.get_encoding("cl100k_base")
            tokens = len(encoding.encode(prompt))
        elif llm_provider == "anthropic":
            # Anthropic uses similar tokenization, approximate
            tokens = int(len(prompt.split()) * 1.3)
        elif llm_provider == "gemini":
            # Gemini tokenization, approximate
            tokens = int(len(prompt.split()) * 1.2)
        else:
            # Fallback approximation
            tokens = int(len(prompt.split()) * 1.3)
        
        return {
            "token_count": tokens,
            "provider": llm_provider,
            "model": llm_model
        }
    except Exception as e:
        logger.error(f"Token counting error: {e}")
        # Fallback to word-based estimation
        tokens = int(len(prompt.split()) * 1.3)
        return {
            "token_count": tokens,
            "provider": llm_provider,
            "model": llm_model,
            "note": "Estimated using fallback method"
        }

@api_router.post("/ecochat/estimate")
async def estimate_prompt_impact(
    request: EstimateRequest,
    current_user: User = Depends(get_current_user)
):
    """Real-time estimation of prompt impact"""
    if not request.prompt.strip():
        return {
            "estimated_tokens": 0,
            "energy_kwh": 0,
            "co2_grams": 0,
            "water_liters": 0,
            "region": request.region
        }
    
    # Estimate tokens
    try:
        if "gpt" in request.model.lower():
            import tiktoken
            encoding = tiktoken.encoding_for_model("gpt-4")
            estimated_tokens = len(encoding.encode(request.prompt))
        elif "claude" in request.model.lower():
            estimated_tokens = int(len(request.prompt.split()) * 1.3)
        elif "gemini" in request.model.lower():
            estimated_tokens = int(len(request.prompt.split()) * 1.2)
        else:
            estimated_tokens = int(len(request.prompt.split()) * 1.3)
    except:
        estimated_tokens = int(len(request.prompt.split()) * 1.3)
    
    # Calculate energy based on model type
    energy_per_token = ENERGY_PER_TOKEN
    if "gpt-5" in request.model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 1.5
    elif "claude-sonnet" in request.model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 1.2
    elif "gemini-3-pro" in request.model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 1.3
    elif "mini" in request.model.lower() or "flash" in request.model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 0.7
    
    energy_kwh = estimated_tokens * energy_per_token
    
    # Calculate CO2 using ClimateQ
    co2_result = await calculate_co2_with_climateq(energy_kwh, request.region)
    co2_kg = co2_result["co2e"]
    co2_grams = co2_kg * 1000

    carbon_intensity = co2_result.get(
        "carbon_intensity",
        await get_carbon_intensity(request.region)
    )

    
    # Calculate water
    water_liters = energy_kwh * WATER_INTENSITY_FACTOR
    
    # return {
    #     "estimated_tokens": estimated_tokens,
    #     "energy_kwh": round(energy_kwh, 6),
    #     "co2_grams": round(co2_grams, 2),
    #     "water_liters": round(water_liters, 4),
    #     "region": request.region,
    #     "carbon_method": co2_result.get("method", "climatiq")
    # }
    return {
        "estimated_tokens": estimated_tokens,
        "energy_kwh": round(energy_kwh, 6),
        "co2_grams": round(co2_grams, 2),
        "water_liters": round(water_liters, 8),
        "region": request.region,
        "carbon_intensity": round(carbon_intensity, 2)
    }

# @api_router.get("/ecochat/allowed-models")
# async def get_allowed_models(current_user: User = Depends(get_current_user)):
#     """Get models allowed for user's department"""
#     if not current_user.department:
#         # If no department, allow all models
#         return {
#             "allowed_models": {
#                 "openai": ["gpt-5.2", "gpt-4o", "gpt-4o-mini"],
#                 "anthropic": ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
#                 "gemini": ["gemini-3-flash-preview", "gemini-3-pro-preview"]
#             },
#             "green_mode_enforced": False
#         }
    
#     # Get department access settings
#     dept = await db.departments.find_one({"department": current_user.department}, {"_id": 0})
    
#     if not dept:
#         # Department not configured, allow all
#         return {
#             "allowed_models": {
#                 "openai": ["gpt-5.2", "gpt-4o", "gpt-4o-mini"],
#                 "anthropic": ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
#                 "gemini": ["gemini-3-flash-preview", "gemini-3-pro-preview"]
#             },
#             "green_mode_enforced": False
#         }
    
#     # Parse allowed models by provider
#     allowed_models_dict = {"openai": [], "anthropic": [], "gemini": []}
#     for model in dept.get("allowed_models", []):
#         if "gpt" in model.lower():
#             allowed_models_dict["openai"].append(model)
#         elif "claude" in model.lower():
#             allowed_models_dict["anthropic"].append(model)
#         elif "gemini" in model.lower():
#             allowed_models_dict["gemini"].append(model)
    
#     return {
#         "allowed_models": allowed_models_dict,
#         "green_mode_enforced": dept.get("green_mode_enforced", False),
#         "token_limit": dept.get("token_limit", 100000)
#     }
    
@api_router.post("/ecochat", response_model=EcoChatResponse)
async def ecochat(
    request: EcoChatRequest,
    current_user: User = Depends(get_current_user)
):
    auto_switched = False
    suggestion = None
    dept = None
    allowed = {}

    # 1️⃣ Load department policy
    if current_user.department:
        dept = await db.departments.find_one({"department": current_user.department})

        if dept:
            allowed = dept.get("allowed_providers", {})

            # 2️⃣ Validate user-selected provider/model
            if request.llm_provider not in allowed:
                raise HTTPException(403, "Provider not allowed")

            if request.llm_model not in allowed[request.llm_provider]:
                raise HTTPException(403, "Model not allowed")

            if request.region not in dept.get("allowed_regions", []):
                raise HTTPException(403, "Region not allowed")

            # Enforce green mode if admin says so
            if dept.get("green_mode_enforced"):
                request.green_mode = True
                suggestion = {"reason": "Green Mode enforced by department policy"}

    # 3️⃣ Now compute green config (ONLY from allowed models)
    best_green_config = await get_best_green_configuration(
        allowed,
        dept.get("allowed_regions", [])
    )


    
    # Optimize prompt if Green Mode
    prompt_to_use = optimize_prompt(request.prompt) if request.green_mode else request.prompt

    # Save original token count BEFORE Green Mode auto-switch
    try:
        if "gpt" in request.llm_model.lower():
            import tiktoken
            encoding = tiktoken.encoding_for_model("gpt-4")
            original_tokens = len(encoding.encode(request.prompt))
        elif "claude" in request.llm_model.lower():
            original_tokens = int(len(request.prompt.split()) * 1.3)
        elif "gemini" in request.llm_model.lower():
            original_tokens = int(len(request.prompt.split()) * 1.2)
        else:
            original_tokens = int(len(request.prompt.split()) * 1.3)
    except:
        original_tokens = int(len(request.prompt.split()) * 1.3)

    # Save original region BEFORE auto-switch
    original_region = request.region
    original_model = request.llm_model


    # 🟢 Green Mode ON → Auto-switch to best configuration
    if request.green_mode and best_green_config:
        request.llm_provider = best_green_config["provider"]
        request.llm_model = best_green_config["model"]
        request.region = best_green_config["region"]
        request.hardware = best_green_config["hardware"]
        auto_switched = True

    
    # Step 1: Calculate tokens based on model
    try:
        if "gpt" in request.llm_model.lower():
            import tiktoken
            encoding = tiktoken.encoding_for_model("gpt-4")
            tokens_used = len(encoding.encode(prompt_to_use))
        elif "claude" in request.llm_model.lower():
            # Claude uses different tokenization
            tokens_used = int(len(prompt_to_use.split()) * 1.3)
        elif "gemini" in request.llm_model.lower():
            # Gemini tokenization
            tokens_used = int(len(prompt_to_use.split()) * 1.2)
        else:
            tokens_used = int(len(prompt_to_use.split()) * 1.3)
    except:
        tokens_used = int(len(prompt_to_use.split()) * 1.3)
    
    # 🔒 Enforce department token limit
    if dept and dept.get("token_limit"):
        if tokens_used > dept["token_limit"]:
            raise HTTPException(
                status_code=403,
                detail=f"Token limit exceeded for {dept['department']} department"
            )

    # Step 2: Calculate energy consumption
    # Different models have different energy profiles
    energy_per_token = ENERGY_PER_TOKEN
    if "gpt-5" in request.llm_model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 1.5  # GPT-5 uses more energy
    elif "claude-sonnet" in request.llm_model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 1.2
    elif "gemini-3-pro" in request.llm_model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 1.3
    elif "mini" in request.llm_model.lower() or "flash" in request.llm_model.lower():
        energy_per_token = ENERGY_PER_TOKEN * 0.7  # Smaller models use less
    
    energy_kwh = tokens_used * energy_per_token
    
    # Step 3: Calculate CO2 using ClimateQ API
    co2_result = await calculate_co2_with_climateq(energy_kwh, request.region)
    co2_kg = co2_result["co2e"]
    co2_grams = co2_kg * 1000  # Convert kg to grams

    # ⚪ Green Mode OFF → Suggest better configuration (no switching)
        # ⚪ Green Mode OFF → Suggest greener allowed model
    if not request.green_mode and best_green_config:
        if not (
            request.llm_model == best_green_config["model"]
            and request.region == best_green_config["region"]
        ):
            suggestion = {
                "recommended_provider": best_green_config["provider"],
                "recommended_model": best_green_config["model"],
                "recommended_region": best_green_config["region"],
                "recommended_hardware": best_green_config["hardware"],
            }



    
    # Step 4: Calculate water consumption
    water_liters = energy_kwh * WATER_INTENSITY_FACTOR
    
    # Try to get actual LLM response if API keys are configured
    response_text = None
    api_keys = {
        "openai": os.getenv("OPENAI_API_KEY"),
        "anthropic": os.getenv("ANTHROPIC_API_KEY"),
        "gemini": os.getenv("GEMINI_API_KEY")
    }
    
    api_key = api_keys.get(request.llm_provider)
    if api_key and not api_key.startswith("your_"):
        try:
            response_text, actual_tokens = await call_llm(
                prompt_to_use,
                request.llm_provider,
                request.llm_model,
                api_key
            )
            # Update metrics with actual tokens
            tokens_used = actual_tokens
            energy_kwh = tokens_used * energy_per_token
            co2_result = await calculate_co2_with_climateq(energy_kwh, request.region)
            co2_kg = co2_result["co2e"]
            co2_grams = co2_kg * 1000
            water_liters = energy_kwh * WATER_INTENSITY_FACTOR
        except Exception as e:
            logger.warning(f"LLM call failed: {e}, using metrics-only response")
            response_text = f"✅ Sustainability Metrics Calculated\n\nYour prompt: \"{request.prompt[:100]}...\"\n\n📊 Environmental Impact:\n• CO2 Emissions: {co2_grams:.2f}g\n• Energy: {energy_kwh:.6f} kWh\n• Water: {water_liters:.4f} L\n• Tokens: {tokens_used}\n\nCalculated using:\n• ClimateQ API: {co2_result.get('emission_factor', 'Electricity Grid')}\n• Method: {co2_result.get('method', 'climatiq')}\n• Region: {co2_result.get('region', request.region)}\n\n💡 Configure LLM API keys for actual AI responses."
    else:
        # No API key - show metrics only
        response_text = f"✅ Sustainability Metrics Calculated\n\nYour prompt: \"{request.prompt[:100]}...\"\n\n📊 Environmental Impact:\n• CO2 Emissions: {co2_grams:.2f}g ({co2_kg:.6f} kg)\n• Energy: {energy_kwh:.6f} kWh\n• Water: {water_liters:.4f} L\n• Tokens: {tokens_used}\n\n🔬 Calculation Method:\n• ClimateQ: {co2_result.get('emission_factor', 'Electricity Grid')}\n• Method: {co2_result.get('method', 'climatiq')}\n• Model: {request.llm_model}\n• Region: {co2_result.get('region', request.region)}\n• Hardware: {request.hardware}\n\n🌱 Green Mode: {'Enabled ✓' if request.green_mode else 'Disabled'}\n\n💡 Each model has different energy consumption:\n• GPT-5: Higher energy (larger model)\n• GPT-4o-mini/Gemini-Flash: Lower energy (efficient)"
    
    quality_score = calculate_quality_score(response_text)
    
    # Calculate CO2 savings only if Green Mode actually changed configuration
    co2_saved = 0.0
    savings = None

    if request.green_mode and auto_switched:
        original_energy_per_token = ENERGY_PER_TOKEN

        if "gpt-5" in original_model.lower():
            original_energy_per_token = ENERGY_PER_TOKEN * 1.5
        elif "claude-sonnet" in original_model.lower():
            original_energy_per_token = ENERGY_PER_TOKEN * 1.2
        elif "gemini-3-pro" in original_model.lower():
            original_energy_per_token = ENERGY_PER_TOKEN * 1.3
        elif "mini" in original_model.lower() or "flash" in original_model.lower():
            original_energy_per_token = ENERGY_PER_TOKEN * 0.7

        original_energy = original_tokens * original_energy_per_token


        original_co2_result = await calculate_co2_with_climateq(
            original_energy,
            original_region
        )
        original_co2_grams = original_co2_result["co2e"] * 1000

        co2_saved = max(0, original_co2_grams - co2_grams)

        savings = {
            "co2": co2_saved
        }

    # Calculate eco points
    eco_points = int(co2_saved * 10) if (request.green_mode and auto_switched) else 0
    
    # Save to database
    chat_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "department": current_user.department.strip().title(),
        "prompt": request.prompt,
        "response_text": response_text,
        "model": request.llm_model,
        "provider": request.llm_provider,
        "region": request.region,
        "hardware": request.hardware,
        "tokens_used": tokens_used,
        "energy_kwh": energy_kwh,
        "co2_grams": co2_grams,
        "co2_saved": co2_saved,
        "water_liters": water_liters,
        "quality_score": quality_score,
        "eco_points": eco_points,
        "green_mode_used": request.green_mode,
        "savings": savings,
        "timestamp": datetime.now(timezone.utc),
        "auto_switched": auto_switched,
        "suggestion": suggestion,

    }
    
    await db.chats.insert_one(chat_doc)
    
    # Update user eco points and co2_saved
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$inc": {
                "eco_points": eco_points,
                "co2_saved": co2_saved
            }
        }
    )
    
    # Check and award badges
    user = await db.users.find_one({"id": current_user.id})
    if user:
        badges_to_award = []
        co2_total = user.get("co2_saved", 0)
        if co2_total >= 100 and "eco-warrior" not in user.get("badges", []):
            badges_to_award.append("eco-warrior")
        if co2_total >= 500 and "green-champion" not in user.get("badges", []):
            badges_to_award.append("green-champion")
        if co2_total >= 1000 and "sustainability-hero" not in user.get("badges", []):
            badges_to_award.append("sustainability-hero")
        
        if badges_to_award:
            await db.users.update_one(
                {"id": current_user.id},
                {"$addToSet": {"badges": {"$each": badges_to_award}}}
            )
    
    return EcoChatResponse(**chat_doc)

# ==================== ANALYTICS ROUTES ====================

@api_router.get("/analytics/prompts", response_model=List[PromptAnalytics])
async def get_prompt_analytics(
    current_user: User = Depends(get_current_user),
    limit: int = 50
):
    chats = await db.chats.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [PromptAnalytics(**chat) for chat in chats]

@api_router.get("/analytics/stats")
async def get_user_stats(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    
    # Get total metrics
    pipeline = [
        {"$match": {"user_id": current_user.id}},
        {
            "$group": {
                "_id": None,
                "total_tokens": {"$sum": "$tokens_used"},
                "total_energy": {"$sum": "$energy_kwh"},
                "total_co2": {"$sum": "$co2_grams"},
                "total_co2_saved": {"$sum": "$co2_saved"},
                "total_water": {"$sum": "$water_liters"},
                "prompt_count": {"$sum": 1}
            }
        }
    ]
    
    result = await db.chats.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {
        "total_tokens": 0,
        "total_energy": 0,
        "total_co2": 0,
        "total_co2_saved": 0,
        "total_water": 0,
        "prompt_count": 0
    }
    
    stats.pop("_id", None)
    stats["eco_points"] = user.get("eco_points", 0)
    stats["badges_count"] = len(user.get("badges", []))
    
    return stats

# ==================== LEADERBOARD ROUTES ====================

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 10):
    users = await db.users.find(
        {"role": "user"},
        {"_id": 0, "password": 0}
    ).sort("eco_points", -1).limit(limit).to_list(limit)
    
    leaderboard = []
    for idx, user in enumerate(users, 1):
        leaderboard.append(LeaderboardEntry(
            user_id=user["id"],
            email=user["email"],
            eco_points=user.get("eco_points", 0),
            co2_saved=user.get("co2_saved", 0.0),
            badges_count=len(user.get("badges", [])),
            rank=idx
        ))
    
    return leaderboard

# ==================== BADGES & COURSES ROUTES ====================

@api_router.get("/badges")
async def get_badges_and_rewards(current_user: User = Depends(get_current_user)):
    # Predefined badges
    all_badges = [
        {"id": "eco-warrior", "name": "Eco Warrior", "description": "Save 100g of CO2", "icon": "leaf", "criteria": "co2_saved >= 100"},
        {"id": "green-champion", "name": "Green Champion", "description": "Save 500g of CO2", "icon": "tree", "criteria": "co2_saved >= 500"},
        {"id": "sustainability-hero", "name": "Sustainability Hero", "description": "Save 1000g of CO2", "icon": "award", "criteria": "co2_saved >= 1000"},
        {"id": "course-completer", "name": "Course Completer", "description": "Complete 1 course", "icon": "graduation-cap", "criteria": "courses_completed >= 1"},
    ]
    
    # Get user's total token savings
    pipeline = [
        {"$match": {"user_id": current_user.id}},
        {"$group": {
            "_id": None,
            "total_co2_saved": {"$sum": "$co2_saved"}
        }}
    ]
    
    result = await db.chats.aggregate(pipeline).to_list(1)
    co2_saved_total = result[0]["total_co2_saved"] if result and result[0]["_id"] is not None else 0
    
    # Define rewards/coupons
    rewards = [
        {
            "id": "spotify-1month",
            "name": "Spotify Premium 1 Month",
            "description": "Get 1 month Spotify Premium subscription",
            "co2_required": 500,
            "unlocked": co2_saved_total >= 500,
            "icon": "music"
        },
        {
            "id": "voucher-1000",
            "name": "Gift Voucher ₹1000",
            "description": "Amazon gift voucher worth ₹1000",
            "co2_required": 1000,
            "unlocked": co2_saved_total >= 1000,
            "icon": "gift"
        },
        {
            "id": "netflix-1month",
            "name": "Netflix 1 Month",
            "description": "Get 1 month Netflix subscription",
            "co2_required": 750,
            "unlocked": co2_saved_total >= 750,
            "icon": "tv"
        },
        {
            "id": "voucher-500",
            "name": "Gift Voucher ₹500",
            "description": "Flipkart gift voucher worth ₹500",
            "co2_required": 500,
            "unlocked": co2_saved_total >= 500,
            "icon": "shopping-bag"
        }
    ]
    
    user = await db.users.find_one({"id": current_user.id})
    user_badges = user.get("badges", [])
    
    return {
        "badges": [{**badge, "unlocked": badge["id"] in user_badges} for badge in all_badges],
        "rewards": rewards,
        "co2_saved": co2_saved_total
    }

@api_router.get("/courses", response_model=List[Course])
async def get_courses(current_user: User = Depends(get_current_user)):
    # Predefined courses
    courses = [
        {
            "id": "intro-sustainability",
            "title": "Introduction to AI Sustainability",
            "description": "Learn the basics of sustainable AI practices",
            "status": "ongoing",
            "eco_points_reward": 100,
            "badge_reward": "course-completer"
        },
        {
            "id": "advanced-green-ai",
            "title": "Advanced Green AI Techniques",
            "description": "Master advanced techniques for reducing AI carbon footprint",
            "status": "locked",
            "eco_points_reward": 250,
            "badge_reward": None
        },
        {
            "id": "esg-compliance",
            "title": "ESG Compliance for AI",
            "description": "Understand ESG reporting requirements",
            "status": "locked",
            "eco_points_reward": 200,
            "badge_reward": None
        }
    ]
    
    return [Course(**course) for course in courses]

# ==================== AI RECOMMENDER ROUTES ====================


@api_router.get("/recommender/models")
async def get_model_recommendations(current_user: User = Depends(get_current_user)):
    pipeline = [
        {
            "$group": {
                "_id": {
                    "provider": "$provider",
                    "model": "$model"
                },
                "total_tokens": {"$sum": "$tokens_used"},
                "total_co2": {"$sum": "$co2_grams"},
                "count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "provider": "$_id.provider",
                "model": "$_id.model",
                "avg_tokens": {"$divide": ["$total_tokens", "$count"]},
                "avg_co2": {"$divide": ["$total_co2", "$count"]},
                "efficiency_score": {
                    "$cond": [
                        {"$lte": ["$total_tokens", 0]},
                        0,
                        {
                            "$round": [
                                {
                                    "$multiply": [
                                        {
                                            "$subtract": [
                                                1,
                                                {
                                                    "$min": [
                                                        1,
                                                        {
                                                            "$divide": [
                                                                {"$divide": ["$total_co2", "$total_tokens"]},
                                                                0.05
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        100
                                    ]
                                },
                                1
                            ]
                        }
                    ]
                }
            }
        },
        {"$sort": {"efficiency_score": -1}},
        {"$limit": 5}
    ]

    results = await db.chats.aggregate(pipeline).to_list(5)
    if not results:
        return {
            "recommendations": [],
            "message": "Not enough data yet. Run a few EcoChat prompts to see recommendations."
        }

    recommendations = []
    for r in results:
        recommendations.append({
            "provider": r["provider"],
            "model": r["model"],
            "avg_tokens": round(r["avg_tokens"], 1),
            "avg_co2": round(r["avg_co2"], 2),
            "efficiency_score": round(r["efficiency_score"], 2),
            "reason": "Based on real usage data"
        })
    
    return {"recommendations": recommendations}
   

@api_router.get("/recommender/regions")
async def get_region_recommendations(current_user: User = Depends(get_current_user)):
    pipeline = [
        {
            "$group": {
                "_id": "$region",
                "count": {"$sum": 1}
            }
        }
    ]

    results = await db.chats.aggregate(pipeline).to_list(10)

    if not results:
        return {
            "regions": [],
            "message": "No regional data yet. Generate some EcoChat usage first."
        }

    regions = []

    for r in results:
        region = r["_id"]

        # 🔥 REAL-TIME carbon intensity
        carbon_intensity = await get_carbon_intensity(region)

        sustainability_score = round(
            max(0, min(100, (1 - carbon_intensity / 700) * 100)),
            0
        )

        regions.append({
            "code": region,
            "name": region,
            "avg_carbon_intensity": round(carbon_intensity, 2),
            "sustainability_score": sustainability_score
        })

    regions.sort(key=lambda x: x["sustainability_score"], reverse=True)

    return {"regions": regions}


# ==================== ADMIN ROUTES ====================
@api_router.get("/admin/esg-report/custom")
async def generate_custom_esg_report(
    department: str,
    start_date: str,
    end_date: str,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
    end = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc) + timedelta(days=1)

    pipeline = [
        {
            "$match": {
                "department": {
                    "$regex": f"^{department}$",
                    "$options": "i"
                },
                "timestamp": {"$gte": start, "$lt": end}
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_tokens": {"$sum": "$tokens_used"},
                "total_co2": {"$sum": "$co2_grams"},
                "total_co2_saved": {"$sum": "$co2_saved"},
                "prompt_count": {"$sum": 1}
            }
        }
    ]

    results = await db.chats.aggregate(pipeline).to_list(100)

    users = []
    for r in results:
        user = await db.users.find_one({"id": r["_id"]})
        users.append({
            "user_email": user["email"] if user else r["_id"],
            "tokens_used": r["total_tokens"],
            "co2_emitted": round(r["total_co2"], 2),
            "co2_saved": round(r["total_co2_saved"], 2),
            "prompt_count": r["prompt_count"]
        })

    return {
        "department": department,
        "start_date": start_date,
        "end_date": end_date,
        "users": users
    }


@api_router.get("/admin/departments", response_model=List[DepartmentAccess])
async def get_departments(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    departments = await db.departments.find({}, {"_id": 0}).to_list(100)

    default_names = ["Engineering", "Research", "Marketing", "Sales", "HR", "Finance"]
    existing_names = {d["department"] for d in departments}

    # ➕ Insert missing departments
    to_insert = []
    for name in default_names:
        if name not in existing_names:
            to_insert.append({
                "id": str(uuid.uuid4()),
                "department": name,
                "allowed_providers": {
                    "openai": [],
                    "anthropic": [],
                    "gemini": []
                },
                "token_limit": 10000,
                "green_mode_enforced": False,
                "allowed_regions": ["US-CAL-CISO", "US-NY-NYIS"]
            })

    if to_insert:
        await db.departments.insert_many(to_insert)
        departments.extend(to_insert)

    normalized = []
    for dept in departments:
        normalized.append({
            "id": dept.get("id"),
            "department": dept.get("department"),
            "allowed_providers": dept.get("allowed_providers", {
                "openai": [],
                "anthropic": [],
                "gemini": []
            }),
            "allowed_regions": dept.get("allowed_regions", []),
            "token_limit": dept.get("token_limit", 10000),
            "green_mode_enforced": dept.get("green_mode_enforced", False)
        })

    return [DepartmentAccess(**d) for d in normalized]


@api_router.put("/admin/departments/{dept_id}")
async def update_department(
    dept_id: str,
    access: DepartmentAccess,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.departments.update_one(
    {"id": dept_id},
    {"$set": {
        "allowed_providers": access.allowed_providers,
        "allowed_regions": access.allowed_regions,
        "token_limit": access.token_limit,
        "green_mode_enforced": access.green_mode_enforced
    }}
    )

    
    return {"message": "Department updated successfully"}

@api_router.get("/admin/analytics/departments")
async def get_department_analytics(
    current_user: User = Depends(get_current_user),
    period: str = "all"  # all, week, month
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Calculate date filter
    date_filter = {}
    if period == "week":
        date_filter = {"timestamp": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}}
    elif period == "month":
        date_filter = {"timestamp": {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}}
    
    # Aggregate by department
    pipeline = [
        {"$match": date_filter} if date_filter else {"$match": {}},
        {
            "$group": {
                "_id": "$department",
                "token_usage": {"$sum": "$tokens_used"},
                "co2_emissions": {"$sum": "$co2_grams"},
                "co2_saved": {"$sum": "$co2_saved"},
                "total_prompts": {"$sum": 1}
            }
        }
    ]
    
    results = await db.chats.aggregate(pipeline).to_list(100)
    
    analytics = []
    for result in results:
        if result["_id"]:  # Skip null departments
            analytics.append({
                "department": result["_id"],
                "token_usage": result["token_usage"],
                "co2_emissions": result["co2_emissions"],
                "co2_saved": result["co2_saved"],
                "total_prompts": result["total_prompts"]
            })
    
    return analytics

@api_router.post("/admin/esg-report")
async def generate_esg_report(
    current_user: User = Depends(get_current_user),
    period: str = "month",  # week, month, year
    year: Optional[int] = None,
    month: Optional[int] = None
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        if year and month:
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        else:
            start_date = now - timedelta(days=30)
            end_date = now
    elif period == "year":
        year = year or now.year
        start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)
        end_date = now
    
    # Aggregate organization-wide stats
    pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": start_date, "$lt": end_date} if period != "all" else {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_tokens": {"$sum": "$tokens_used"},
                "total_co2": {"$sum": "$co2_grams"},
                "total_co2_saved": {"$sum": "$co2_saved"},
                "total_energy": {"$sum": "$energy_kwh"},
                "total_water": {"$sum": "$water_liters"},
                "total_prompts": {"$sum": 1},
                "green_mode_usage": {
                    "$sum": {"$cond": ["$green_mode_used", 1, 0]}
                }
            }
        }
    ]
    
    result = await db.chats.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {
        "total_tokens": 0,
        "total_co2": 0,
        "total_co2_saved": 0,
        "total_energy": 0,
        "total_water": 0,
        "total_prompts": 0,
        "green_mode_usage": 0
    }
    
    # Department breakdown
    dept_pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": start_date, "$lt": end_date} if period != "all" else {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": "$department",
                "tokens": {"$sum": "$tokens_used"},
                "co2": {"$sum": "$co2_grams"},
                "co2_saved": {"$sum": "$co2_saved"}
            }
        }
    ]
    
    dept_results = await db.chats.aggregate(dept_pipeline).to_list(100)
    department_breakdown = [
        {
            "department": r["_id"] or "Unassigned",
            "tokens": r["tokens"],
            "co2_emissions": r["co2"],
            "co2_saved": r["co2_saved"]
        }
        for r in dept_results
    ]
    
    stats.pop("_id", None)
    stats["report_date"] = now.isoformat()
    stats["period"] = period
    stats["start_date"] = start_date.isoformat()
    stats["end_date"] = end_date.isoformat() if period != "all" else now.isoformat()
    stats["organization"] = "Demo Organization"
    stats["department_breakdown"] = department_breakdown
    stats["green_mode_percentage"] = (
        (stats["green_mode_usage"] / stats["total_prompts"] * 100)
        if stats["total_prompts"] > 0 else 0
    )
    
    return stats
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None


@api_router.get("/admin/users")
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users


@api_router.post("/admin/users")
async def create_user(user: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": get_password_hash(user.password),
        "role": user.role or "user",
        "department": user.department,
        "eco_points": 0,
        "co2_saved": 0.0,
        "badges": [],
        "created_at": datetime.now(timezone.utc)
    }

    await db.users.insert_one(user_doc)
    user_doc.pop("password")
    return user_doc


@api_router.put("/admin/users/{user_id}")
async def update_user(
    user_id: str,
    user: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    update_data = user.dict(exclude_unset=True)

    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])

    result = await db.users.update_one({"id": user_id}, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User updated successfully"}


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    result = await db.users.delete_one({"id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
