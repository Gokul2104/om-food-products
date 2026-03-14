from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from models.stock_entry import StockEntry, StockEntryType
from models.product import Product
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
async def get_stock_levels():
    products = await Product.find_all().to_list()
    return [
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
        for p in products if p.is_active
    ]

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

@router.get("/history/{product_id}", dependencies=[Depends(get_current_user)])
async def stock_history(product_id: str):
    entries = await StockEntry.find(StockEntry.product_id == product_id).sort("-created_at").to_list()
    return [entry_out(e) for e in entries]
