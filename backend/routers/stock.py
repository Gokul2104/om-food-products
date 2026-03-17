from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import csv
import io
from models.stock_entry import StockEntry, StockEntryType
from models.product import Product, UnitType
from models.category import Category
from models.user import User, UserRole
from core.security import require_roles, get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/stock", tags=["Stock"])

stock_or_admin = require_roles(UserRole.admin, UserRole.stock_manager)
admin_only = require_roles(UserRole.admin)

class StockInRequest(BaseModel):
    product_id: str
    quantity: float
    unit_cost: Optional[float] = None
    notes: Optional[str] = None

class StockAdjustRequest(BaseModel):
    product_id: str
    new_quantity: float
    notes: Optional[str] = None

def entry_out(e: StockEntry):
    return {
        "id": str(e.id),
        "product_id": e.product_id,
        "product_name": e.product_name,
        "type": e.type,
        "quantity": e.quantity,
        "notes": e.notes,
        "performed_by_name": e.performed_by_name,
        "created_at": e.created_at
    }

@router.get("", dependencies=[Depends(get_current_user)])
async def get_stock_levels(search: Optional[str] = Query(None)):
    # Build query
    filters = [Product.is_active == True]
    if search:
        # Case-insensitive search on name or p_id
        filters.append({
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"p_id": {"$regex": search, "$options": "i"}}
            ]
        })
    
    # Execute query
    products = await Product.find(*filters).to_list()
    
    result = [
        {
            "id": str(p.id),
            "p_id": p.p_id,
            "name": p.name,
            "category_name": p.category_name,
            "unit": p.unit,
            "current_stock": p.current_stock,
            "min_stock_alert": p.min_stock_alert,
            "is_low_stock": p.current_stock <= p.min_stock_alert,
            "is_active": p.is_active
        }
        for p in products
    ]
    
    # Sort: Low stock products first, then by current stock level
    result.sort(key=lambda x: (not x["is_low_stock"], x["current_stock"]))
    return result

@router.post("/in", dependencies=[Depends(stock_or_admin)])
async def stock_in(data: StockInRequest, current_user: User = Depends(get_current_user)):
    product = await Product.get(data.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    # Update denormalized stock on product
    product.current_stock += data.quantity
    await product.save()

    # Record in ledger
    entry = StockEntry(
        product_id=str(product.id),
        product_name=product.name,
        type=StockEntryType.IN,
        quantity=data.quantity,
        unit_cost=data.unit_cost,
        notes=data.notes,
        performed_by=str(current_user.id),
        performed_by_name=current_user.name,
    )
    await entry.insert()
    return {"message": "Stock added", "new_stock": product.current_stock, "entry": entry_out(entry)}

@router.post("/adjust", dependencies=[Depends(admin_only)])
async def adjust_stock(data: StockAdjustRequest, current_user: User = Depends(get_current_user)):
    product = await Product.get(data.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_qty = product.current_stock
    product.current_stock = data.new_quantity
    await product.save()

    entry = StockEntry(
        product_id=str(product.id),
        product_name=product.name,
        type=StockEntryType.ADJUSTMENT,
        quantity=data.new_quantity - old_qty,  # can be negative
        notes=data.notes or f"Manual adjustment from {old_qty} to {data.new_quantity}",
        performed_by=str(current_user.id),
        performed_by_name=current_user.name,
    )
    await entry.insert()
    return {"message": "Stock adjusted", "new_stock": product.current_stock}

@router.post("/bulk-upload", dependencies=[Depends(admin_only)])
async def bulk_upload_stock(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        content = await file.read()
        string_content = content.decode("utf-8")
        f = io.StringIO(string_content)
        reader = csv.DictReader(f)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {str(e)}")
    
    results = {
        "created_products": 0,
        "updated_stock": 0,
        "created_categories": 0,
        "errors": []
    }
    
    category_cache = {}
    
    # Process rows
    for row_idx, row in enumerate(reader, start=2): # Header is row 1
        try:
            # Match CSV column names exactly as provided in the sample
            category_name = (row.get("Category") or "").strip()
            product_code = (row.get("Product Code") or "").strip()
            product_name = (row.get("PRODUCT NAME") or "").strip()
            unit_str = (row.get("Unit") or "").strip().lower()
            selling_price_str = (row.get("Selling Price") or "0").strip()
            qty_str = (row.get("Qty") or "0").strip()
            cost_price_str = (row.get("Cost Price Per Qty (Inc GST)") or "0").strip()

            if not product_code or not product_name:
                # Skip empty rows (like row 22 in user's example)
                if not any(row.values()):
                    continue
                results["errors"].append(f"Row {row_idx}: Missing product code or name")
                continue
            
            try:
                selling_price = float(selling_price_str)
                qty = float(qty_str)
                cost_price = float(cost_price_str)
            except ValueError:
                results["errors"].append(f"Row {row_idx}: Invalid numeric values")
                continue

            # 1. Category validation/creation
            cat_id = None
            final_cat_name = None
            if category_name:
                if category_name not in category_cache:
                    cat = await Category.find_one(Category.name == category_name)
                    if not cat:
                        cat = Category(name=category_name)
                        await cat.insert()
                        results["created_categories"] += 1
                    category_cache[category_name] = (str(cat.id), cat.name)
                cat_id, final_cat_name = category_cache[category_name]

            # 2. Unit validation
            try:
                unit = UnitType(unit_str)
            except ValueError:
                results["errors"].append(f"Row {row_idx}: Invalid unit '{unit_str}'. Must be mls, gms, or pkts.")
                continue

            # 3. Product checks
            product = await Product.find_one(Product.p_id == product_code)
            
            if not product:
                # Create product
                product = Product(
                    p_id=product_code,
                    name=product_name,
                    category_id=cat_id,
                    category_name=final_cat_name,
                    unit=unit,
                    selling_price=selling_price,
                    cost_price=cost_price,
                    current_stock=qty,
                    is_active=True
                )
                await product.insert()
                results["created_products"] += 1
            else:
                # Update existing product
                product.current_stock += qty
                product.selling_price = selling_price
                product.cost_price = cost_price
                # Update category if it's different in CSV
                if cat_id:
                    product.category_id = cat_id
                    product.category_name = final_cat_name
                await product.save()
                results["updated_stock"] += 1
                
            # 4. Record stock entry
            if qty != 0:
                entry = StockEntry(
                    product_id=str(product.id),
                    product_name=product.name,
                    type=StockEntryType.IN if qty > 0 else StockEntryType.OUT,
                    quantity=abs(qty),
                    unit_cost=cost_price,
                    notes="Bulk upload from CSV",
                    performed_by=str(current_user.id),
                    performed_by_name=current_user.name,
                )
                await entry.insert()
                
        except Exception as e:
            results["errors"].append(f"Row {row_idx}: {str(e)}")
            
    return results

@router.get("/history/{product_id}", dependencies=[Depends(get_current_user)])
async def stock_history(product_id: str):
    entries = await StockEntry.find(StockEntry.product_id == product_id).sort("-created_at").to_list()
    return [entry_out(e) for e in entries]
