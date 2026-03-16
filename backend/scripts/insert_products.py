import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to sys.path to import models and core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from core.config import settings
from models.category import Category
from models.product import Product, UnitType
from models.stock_entry import StockEntry, StockEntryType
from models.user import User

# Product Data from Image
PRODUCT_DATA = [
    {"cat": "PICKLES", "p_id": "LP250", "name": "LIME PICKLE -250Gms", "price": 75.0, "cost": 54.6, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "LP500", "name": "LIME PICKLE -500Gms", "price": 150.0, "cost": 109.2, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "NP250", "name": "NARTHANGAI PICKLE -250Gms", "price": 75.0, "cost": 54.6, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "NP500", "name": "NARTHANGAI PICKLE -500Gms", "price": 150.0, "cost": 109.2, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "CP250", "name": "CITRON PICKLE -250Gms", "price": 75.0, "cost": 54.6, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "CP500", "name": "CITRON PICKLE -500Gms", "price": 150.0, "cost": 109.2, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "MT250", "name": "MANGO THOKKU -250Gms", "price": 75.0, "cost": 54.6, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "CMP250", "name": "CUT MANGO -250Gms", "price": 75.0, "cost": 54.6, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "MAP250", "name": "MANGO AAVAKKAI PICKLE -250Gms", "price": 75.0, "cost": 54.6, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "MAP500", "name": "MANGO AAVAKKAI PICKLE -500Gms", "price": 150.0, "cost": 109.2, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "AP250", "name": "AMLA PICKLE -250Gms", "price": 75.0, "cost": 54.6, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "GCP250", "name": "GREEN CHILLI PICKLE -250Gms", "price": 75.0, "cost": 54.6, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "RCP250", "name": "RED CHILLI PICKLE -250Gms", "price": 75.0, "cost": 54.6, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "MXVP250", "name": "MIXED VEGETABLES PICKLE -250Gms", "price": 75.0, "cost": 0.0, "stock": 0.0},
    {"cat": "PICKLES", "p_id": "MG250", "name": "MANGO GINGER -250Gms", "price": 85.0, "cost": 59.85, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "BSP250", "name": "BANANA STEAM PICKLE -250Gms", "price": 85.0, "cost": 0.0, "stock": 0.0},
    {"cat": "PICKLES", "p_id": "GP250", "name": "GARLIC PICKLE -250Gms", "price": 85.0, "cost": 59.85, "stock": 12.0},
    {"cat": "PICKLES", "p_id": "GP500", "name": "GARLIC PICKLE -500Gms", "price": 170.0, "cost": 119.7, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "VM250", "name": "VADU MANGO -250Gms", "price": 115.0, "cost": 82.95, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "VM500", "name": "VADU MANGO -500Gms", "price": 230.0, "cost": 165.9, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "MP250", "name": "MAHALI PICKLE -250Gms", "price": 170.0, "cost": 119.7, "stock": 8.0},
    {"cat": "PICKLES", "p_id": "NSD100", "name": "NARTHANGAI SALT (DRY) -100Gms", "price": 30.0, "cost": 17.85, "stock": 20.0},
    {"cat": "THOKKU VARIETIES", "p_id": "OT250", "name": "ONION THOKKU -250Gms", "price": 85.0, "cost": 0.0, "stock": 0.0},
    {"cat": "THOKKU VARIETIES", "p_id": "GT250", "name": "GINGER THOKKU -250Gms", "price": 85.0, "cost": 0.0, "stock": 0.0},
    {"cat": "THOKKU VARIETIES", "p_id": "TT250", "name": "TOMATO THOKKU -250Gms", "price": 85.0, "cost": 59.85, "stock": 12.0},
    {"cat": "THOKKU VARIETIES", "p_id": "TT500", "name": "TOMATO THOKKU -500Gms", "price": 170.0, "cost": 119.7, "stock": 8.0},
    {"cat": "THOKKU VARIETIES", "p_id": "GC250", "name": "GONGURA CHATNI -250Gms", "price": 85.0, "cost": 0.0, "stock": 0.0},
    {"cat": "THOKKU VARIETIES", "p_id": "CULT250", "name": "CURRY LEAVES THOKKU -250Gms", "price": 85.0, "cost": 0.0, "stock": 0.0},
    {"cat": "THOKKU VARIETIES", "p_id": "COLT250", "name": "CORIENDER LEAVES THOKKU -250Gms", "price": 85.0, "cost": 59.85, "stock": 8.0},
    {"cat": "THOKKU VARIETIES", "p_id": "PULT250", "name": "PUDHEENA LEAVES THOKKU -250Gms", "price": 85.0, "cost": 59.85, "stock": 8.0},
    {"cat": "INSTANT MIX", "p_id": "PM250", "name": "PULIYODHARAI MIX -250Gms", "price": 90.0, "cost": 65.63, "stock": 12.0},
    {"cat": "INSTANT MIX", "p_id": "PM500", "name": "PULIYODHARAI MIX -500Gms", "price": 180.0, "cost": 131.25, "stock": 8.0},
    {"cat": "INSTANT MIX", "p_id": "VKM250", "name": "VATHAL KUZHAMBU MIX -250Gms", "price": 90.0, "cost": 65.1, "stock": 12.0},
    {"cat": "INSTANT MIX", "p_id": "VKM500", "name": "VATHAL KUZHAMBU MIX -500Gms", "price": 180.0, "cost": 131.25, "stock": 8.0},
    {"cat": "INSTANT MIX", "p_id": "KKM250", "name": "KADHAMBHA KUZHAMBU -250Gms", "price": 90.0, "cost": 0.0, "stock": 0.0},
    {"cat": "INSTANT MIX", "p_id": "TOT250", "name": "TOMATO ONION THOKKU -250Gms", "price": 90.0, "cost": 0.0, "stock": 0.0},
    {"cat": "HERBAL PRODUCTS", "p_id": "VT250", "name": "VALLARAI THOKKU -250Gms", "price": 100.0, "cost": 77.18, "stock": 12.0},
    {"cat": "HERBAL PRODUCTS", "p_id": "PT250", "name": "PIRANDAI THOKKU -250Gms", "price": 100.0, "cost": 77.18, "stock": 12.0},
    {"cat": "HERBAL PRODUCTS", "p_id": "MT250", "name": "MANATHAKALI THOKKU -250Gms", "price": 100.0, "cost": 77.18, "stock": 12.0},
    {"cat": "HERBAL PRODUCTS", "p_id": "BGP250", "name": "BITTER GUARD PICKLE -250Gms", "price": 100.0, "cost": 0.0, "stock": 0.0},
    {"cat": "HEALTH MIX", "p_id": "KM250", "name": "Kanji Maavu -250Gms", "price": 150.0, "cost": 0.0, "stock": 0.0},
    {"cat": "HEALTH MIX", "p_id": "KM500", "name": "Kanji Maavu -500Gms", "price": 300.0, "cost": 0.0, "stock": 0.0},
    {"cat": "POWDERS", "p_id": "IPN100", "name": "IDLY PODI -100Gms", "price": 50.0, "cost": 22.05, "stock": 20.0},
    {"cat": "POWDERS", "p_id": "IPG100", "name": "IDLY PODI (with garlic) -100Gms", "price": 50.0, "cost": 23.1, "stock": 10.0},
    {"cat": "POWDERS", "p_id": "ADP100", "name": "ANDHRA DHALL PODI -100Gms", "price": 50.0, "cost": 24.15, "stock": 20.0},
    {"cat": "POWDERS", "p_id": "GPOW100", "name": "GARLIC POWDER -100Gms", "price": 50.0, "cost": 25.2, "stock": 20.0},
    {"cat": "POWDERS", "p_id": "DP100", "name": "DHALL PODI -100Gms", "price": 50.0, "cost": 27.3, "stock": 10.0},
    {"cat": "POWDERS", "p_id": "CLP100", "name": "CURRY LEAVES PODI -100Gms", "price": 50.0, "cost": 31.5, "stock": 10.0},
    {"cat": "POWDERS", "p_id": "APOW100", "name": "ANGAYA PODI -100Gms", "price": 50.0, "cost": 31.5, "stock": 10.0},
    {"cat": "POWDERS", "p_id": "SP100", "name": "SAMBAR POWDER -100Gms", "price": 60.0, "cost": 27.3, "stock": 20.0},
    {"cat": "POWDERS", "p_id": "SP250", "name": "SAMBAR POWDER -250Gms", "price": 160.0, "cost": 0.0, "stock": 0.0},
    {"cat": "POWDERS", "p_id": "RP100", "name": "RASAM POWDER -100Gms", "price": 70.0, "cost": 31.5, "stock": 10.0},
    {"cat": "POWDERS", "p_id": "RP250", "name": "RASAM POWDER -250Gms", "price": 180.0, "cost": 0.0, "stock": 0.0},
    {"cat": "VADAM & APPALAM", "p_id": "OMV250", "name": "OMPODI VADAM -250Gms", "price": 80.0, "cost": 42.0, "stock": 40.0},
    {"cat": "VADAM & APPALAM", "p_id": "NV250", "name": "NEETU VADAM -250Gms", "price": 80.0, "cost": 42.0, "stock": 40.0},
    {"cat": "VADAM & APPALAM", "p_id": "RV250", "name": "RIBBON VADAM -250Gms", "price": 80.0, "cost": 42.0, "stock": 40.0},
    {"cat": "VADAM & APPALAM", "p_id": "SCV250", "name": "SAGO VADAM (GREEN CHILLI) -250Gms", "price": 80.0, "cost": 49.88, "stock": 40.0},
    {"cat": "VADAM & APPALAM", "p_id": "SRV250", "name": "SAGO VADAM (RED CHILLI) -250Gms", "price": 80.0, "cost": 49.88, "stock": 40.0},
    {"cat": "VADAM & APPALAM", "p_id": "SHMV250", "name": "SAGO VADAM (HAND MADE) -250Gms", "price": 90.0, "cost": 55.13, "stock": 40.0},
    {"cat": "VADAM & APPALAM", "p_id": "KV250", "name": "KANJI VADAM -250Gms", "price": 90.0, "cost": 44.63, "stock": 20.0},
    {"cat": "VADAM & APPALAM", "p_id": "TOV250", "name": "TOMATO VADAM -250Gms", "price": 90.0, "cost": 49.88, "stock": 20.0},
    {"cat": "VADAM & APPALAM", "p_id": "EV250", "name": "ELAI VADAM -250Gms", "price": 90.0, "cost": 0.0, "stock": 0.0},
    {"cat": "VADAM & APPALAM", "p_id": "OV250", "name": "ONION VADAM -250Gms", "price": 90.0, "cost": 0.0, "stock": 0.0},
    {"cat": "VADAM & APPALAM", "p_id": "PA250", "name": "PEPPER-LIJJAT APPALAM -250Gms", "price": 140.0, "cost": 99.75, "stock": 12.0},
    {"cat": "VADAM & APPALAM", "p_id": "JP250", "name": "JEERA APPALAM POOO -250Gms", "price": 80.0, "cost": 63.0, "stock": 8.0},
    {"cat": "VADAM & APPALAM", "p_id": "THV250", "name": "THALIR VADAM -250Gms", "price": 90.0, "cost": 48.3, "stock": 20.0},
    {"cat": "VADAM & APPALAM", "p_id": "RA300", "name": "RICE APPALAM (MM) -300Gms", "price": 130.0, "cost": 63.0, "stock": 10.0},
    {"cat": "VADAM & APPALAM", "p_id": "TA200", "name": "TAPIOCA APPALAM -200Gms", "price": 130.0, "cost": 52.5, "stock": 10.0},
    {"cat": "VADAM & APPALAM", "p_id": "UAS200", "name": "ULUNDHU APPALAM SMALL -200Gms", "price": 100.0, "cost": 40.0, "stock": 10.0},
    {"cat": "VADAM & APPALAM", "p_id": "UAM350", "name": "ULUNDHU APPALAM MEDIUM -350Gms", "price": 130.0, "cost": 60.0, "stock": 10.0},
    {"cat": "VADAM & APPALAM", "p_id": "UAB500", "name": "ULUNDHU APPALAM BIG -500Gms", "price": 160.0, "cost": 100.0, "stock": 4.0},
    {"cat": "VATHAL ITEMS", "p_id": "TV5P", "name": "THALIPPU VADAM -100Gms", "price": 50.0, "cost": 27.3, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "VP5P", "name": "VEPALAKATTI (DRY PICKLE) -100Gms", "price": 80.0, "cost": 29.4, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "CVS100", "name": "CHUNDAKAI VATHAL -100Gms", "price": 60.0, "cost": 40.95, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "CS100", "name": "CHUNDAKAI VATHAL (WITH OUT SALT) -100Gms", "price": 70.0, "cost": 43.05, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "MVS100", "name": "MANATHAKALI VATHAL -100Gms", "price": 60.0, "cost": 27.3, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "MS100", "name": "MANATHAKALI VATHAL (WITH OUT SALT) -100Gms", "price": 70.0, "cost": 28.35, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "KV100", "name": "KOTHAVARANGAI VATHAL -100Gms", "price": 60.0, "cost": 25.2, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "CCG100", "name": "CURD CHILLI (GUNDU) -100Gms", "price": 60.0, "cost": 22.05, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "CCN100", "name": "CURD CHILLI (NEETU) -100Gms", "price": 60.0, "cost": 22.05, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "LFV100", "name": "LADIES FINGER VATHAL -100Gms", "price": 60.0, "cost": 28.35, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "MIV100", "name": "MITHUKKU VATHAL -100Gms", "price": 60.0, "cost": 34.13, "stock": 10.0},
    {"cat": "VATHAL ITEMS", "p_id": "MV100", "name": "MANGO VATHAL -100Gms", "price": 60.0, "cost": 0.0, "stock": 0.0}
]

async def insert_products():
    # Initialize connection
    client = AsyncIOMotorClient("mongodb+srv://omapp:DwqmxgxpklVyglNp@omshop.q2jeklo.mongodb.net/?appName=omshop")
    await init_beanie(
        database=client["omshop"],
        document_models=[Category, Product, StockEntry, User]
    )

    print(f"Connected to database: {settings.DB_NAME}")

    # Find the admin user to associate with stock entries
    admin = await User.find_one(User.email == "admin@omshop.com")
    if not admin:
        # Fallback to any user or a generic one if admin isn't found
        admin = await User.find_one()
        if not admin:
            print("❌ No user found in database. Please run the app once to create the default admin.")
            return

    # 1. Gather all unique categories
    category_names = sorted(list(set(item["cat"] for item in PRODUCT_DATA)))
    category_map = {}

    for name in category_names:
        cat = await Category.find_one(Category.name == name)
        if not cat:
            cat = Category(name=name, description=f"{name} Category")
            await cat.insert()
            print(f"Created category: {name}")
        category_map[name] = cat

    # 2. Insert Products and Stock Entries
    count = 0
    stock_count = 0
    for item in PRODUCT_DATA:
        # Check if product already exists by p_id
        existing = await Product.find_one(Product.p_id == item["p_id"])
        
        target_stock = item["stock"] if item["stock"] is not None else 0.0
        
        if existing:
            # Update existing product
            existing.name = item["name"]
            existing.selling_price = item["price"]
            existing.cost_price = item["cost"]
            # We add to current stock if we want to add, or set it. 
            # For a fresh seed, we set it.
            existing.current_stock = target_stock 
            existing.unit = UnitType.pkts # 1 quantity unit
            existing.category_id = str(category_map[item["cat"]].id)
            existing.category_name = item["cat"]
            await existing.save()
            product = existing
        else:
            # Create new product
            product = Product(
                p_id=item["p_id"],
                name=item["name"],
                category_id=str(category_map[item["cat"]].id),
                category_name=item["cat"],
                unit=UnitType.pkts, # 1 quantity unit
                selling_price=item["price"],
                cost_price=item["cost"],
                current_stock=target_stock,
                is_active=True
            )
            await product.insert()
        
        # 3. Create Stock Entry for initial stock if quantity > 0
        if target_stock > 0:
            # Check if an initial stock entry already exists to avoid duplication
            entry = StockEntry(
                product_id=str(product.id),
                product_name=product.name,
                type=StockEntryType.IN,
                quantity=target_stock,
                unit_cost=product.cost_price,
                notes="Initial stock from image data",
                performed_by="script",
                performed_by_name="script"
            )
            await entry.insert()
            stock_count += 1
            
        count += 1
    
    print(f"Successfully processed {count} products and created {stock_count} stock entries.")

if __name__ == "__main__":
    asyncio.run(insert_products())
