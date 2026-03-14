from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from models.user import User, UserRole
from core.security import get_password_hash, require_roles
from datetime import datetime

router = APIRouter(prefix="/api/users", tags=["Users"])

admin_only = require_roles(UserRole.admin)

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.biller

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

def user_out(u: User):
    return {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at
    }

@router.get("", dependencies=[Depends(admin_only)])
async def list_users():
    users = await User.find_all().to_list()
    return [user_out(u) for u in users]

@router.post("", dependencies=[Depends(admin_only)], status_code=201)
async def create_user(data: UserCreate):
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=data.name,
        email=data.email,
        password=get_password_hash(data.password),
        role=data.role,
    )
    await user.insert()
    return user_out(user)

@router.put("/{user_id}", dependencies=[Depends(admin_only)])
async def update_user(user_id: str, data: UserUpdate):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.name is not None:
        user.name = data.name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    await user.save()
    return user_out(user)

@router.delete("/{user_id}", dependencies=[Depends(admin_only)])
async def delete_user(user_id: str):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await user.save()
    return {"message": "User deactivated"}
