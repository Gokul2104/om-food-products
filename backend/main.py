import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from models.user import User
from models.category import Category
from models.product import Product
from models.stock_entry import StockEntry
from models.invoice import Invoice
from models.return_model import Return
from routers import auth, users, categories, products, stock, invoices, returns, reports
from core.security import get_password_hash

app = FastAPI(
    title="OM Food Products — Stock & Billing API",
    version="1.0.0",
    description="Stock Management and Billing system for OM Food Products"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://om-food-products.onrender.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(stock.router)
app.include_router(invoices.router)
app.include_router(returns.router)
app.include_router(reports.router)

@app.on_event("startup")
async def startup():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.DB_NAME],
        document_models=[User, Category, Product, StockEntry, Invoice, Return]
    )
    await seed_default_admin()

async def seed_default_admin():
    """Create default admin user if no users exist"""
    count = await User.count()
    if count == 0:
        admin = User(
            name="Admin",
            email="admin@omshop.com",
            password=get_password_hash("admin123"),
            role="Admin",
            is_active=True
        )
        await admin.insert()
        print("✅ Default admin created: admin@omshop.com / admin123")

@app.get("/")
async def root():
    return {"message": "OM Food Products API is running", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)