from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from models.product import Product, UnitType
from models.category import Category
from models.user import UserRole
from core.security import require_roles, get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/products", tags=["Products"])

stock_or_admin = require_roles(UserRole.admin, UserRole.stock_manager)
admin_only = require_roles(UserRole.admin)

class ProductCreate(BaseModel):
    p_id: str
    name: str
    category_id: Optional[str] = None
    description: Optional[str] = None
    unit: UnitType = UnitType.pcs
    selling_price: float
    cost_price: float
    tax_rate: float = 0.0
    min_stock_alert: int = 5

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[UnitType] = None
    selling_price: Optional[float] = None
    cost_price: Optional[float] = None
    tax_rate: Optional[float] = None
    min_stock_alert: Optional[int] = None
    is_active: Optional[bool] = None

def prod_out(p: Product):
    return {
        "id": str(p.id),
        "p_id": p.p_id,
        "name": p.name,
        "category_id": p.category_id,
        "category_name": p.category_name,
        "description": p.description,
        "unit": p.unit,
        "selling_price": p.selling_price,
        "cost_price": p.cost_price,
        "tax_rate": p.tax_rate,
        "min_stock_alert": p.min_stock_alert,
        "current_stock": p.current_stock,
        "is_active": p.is_active,
        "created_at": p.created_at,
        "is_low_stock": p.current_stock <= p.min_stock_alert
    }

@router.get("", dependencies=[Depends(get_current_user)])
async def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    active_only: bool = Query(True)
):
    query = {}
    products = await Product.find_all().to_list()
    result = []
    for p in products:
        if active_only and not p.is_active:
            continue
        if search and search.lower() not in p.name.lower() and search.lower() not in p.p_id.lower():
            continue
        if category_id and p.category_id != category_id:
            continue
        if low_stock is True and p.current_stock > p.min_stock_alert:
            continue
        result.append(prod_out(p))
    return result

@router.get("/low-stock", dependencies=[Depends(get_current_user)])
async def low_stock_products():
    products = await Product.find_all().to_list()
    return [prod_out(p) for p in products if p.is_active and p.current_stock <= p.min_stock_alert]

@router.get("/{product_id}", dependencies=[Depends(get_current_user)])
async def get_product(product_id: str):
    product = await Product.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod_out(product)

@router.post("", dependencies=[Depends(stock_or_admin)], status_code=201)
async def create_product(data: ProductCreate):
    existing = await Product.find_one(Product.p_id == data.p_id)
    if existing:
        raise HTTPException(status_code=400, detail="Product ID (p_id) already exists")

    cat_name = None
    if data.category_id:
        cat = await Category.get(data.category_id)
        if cat:
            cat_name = cat.name

    product = Product(
        p_id=data.p_id,
        name=data.name,
        category_id=data.category_id,
        category_name=cat_name,
        description=data.description,
        unit=data.unit,
        selling_price=data.selling_price,
        cost_price=data.cost_price,
        tax_rate=data.tax_rate,
        min_stock_alert=data.min_stock_alert,
        current_stock=0.0,
    )
    await product.insert()
    return prod_out(product)

@router.put("/{product_id}", dependencies=[Depends(stock_or_admin)])
async def update_product(product_id: str, data: ProductUpdate):
    product = await Product.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.dict(exclude_none=True)
    if "category_id" in update_data:
        cat = await Category.get(update_data["category_id"])
        if cat:
            update_data["category_name"] = cat.name

    for key, value in update_data.items():
        setattr(product, key, value)
    await product.save()
    return prod_out(product)

@router.delete("/{product_id}", dependencies=[Depends(admin_only)])
async def delete_product(product_id: str):
    product = await Product.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    await product.save()
    return {"message": "Product deactivated"}
