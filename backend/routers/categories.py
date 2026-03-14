from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from models.category import Category
from models.user import UserRole
from core.security import require_roles, get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/categories", tags=["Categories"])

stock_or_admin = require_roles(UserRole.admin, UserRole.stock_manager)
admin_only = require_roles(UserRole.admin)

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

def cat_out(c: Category):
    return {"id": str(c.id), "name": c.name, "description": c.description, "created_at": c.created_at}

@router.get("", dependencies=[Depends(get_current_user)])
async def list_categories():
    cats = await Category.find_all().to_list()
    return [cat_out(c) for c in cats]

@router.post("", dependencies=[Depends(stock_or_admin)], status_code=201)
async def create_category(data: CategoryCreate):
    existing = await Category.find_one(Category.name == data.name)
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = Category(name=data.name, description=data.description)
    await cat.insert()
    return cat_out(cat)

@router.put("/{cat_id}", dependencies=[Depends(stock_or_admin)])
async def update_category(cat_id: str, data: CategoryUpdate):
    cat = await Category.get(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if data.name is not None:
        cat.name = data.name
    if data.description is not None:
        cat.description = data.description
    await cat.save()
    return cat_out(cat)

@router.delete("/{cat_id}", dependencies=[Depends(admin_only)])
async def delete_category(cat_id: str):
    cat = await Category.get(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await cat.delete()
    return {"message": "Category deleted"}
