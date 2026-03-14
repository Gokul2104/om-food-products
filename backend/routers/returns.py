from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from models.return_model import Return, ReturnItem, RefundMethod
from models.invoice import Invoice
from models.product import Product
from models.stock_entry import StockEntry, StockEntryType
from models.user import User, UserRole
from core.security import require_roles, get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/returns", tags=["Returns"])

biller_or_admin = require_roles(UserRole.admin, UserRole.biller)

class ReturnItemIn(BaseModel):
    product_id: str
    quantity: float
    reason: Optional[str] = None

class ReturnCreate(BaseModel):
    invoice_id: str
    items: List[ReturnItemIn]
    refund_amount: Optional[float] = None  # Manual override if provided
    refund_method: RefundMethod = RefundMethod.cash
    notes: Optional[str] = None

def return_out(r: Return):
    return {
        "id": str(r.id),
        "invoice_id": r.invoice_id,
        "invoice_number": r.invoice_number,
        "items": [i.dict() for i in r.items],
        "refund_amount": r.refund_amount,
        "refund_method": r.refund_method,
        "processed_by_name": r.processed_by_name,
        "notes": r.notes,
        "created_at": r.created_at
    }

@router.post("", dependencies=[Depends(biller_or_admin)], status_code=201)
async def process_return(data: ReturnCreate, current_user: User = Depends(get_current_user)):
    invoice = await Invoice.get(data.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Build a map of invoice items for validation
    invoiced = {item.product_id: item for item in invoice.items}
    return_items = []
    refund_amount = 0.0

    for item_in in data.items:
        if item_in.product_id not in invoiced:
            raise HTTPException(
                status_code=400,
                detail=f"Product {item_in.product_id} not in original invoice"
            )
        inv_item = invoiced[item_in.product_id]
        if item_in.quantity > inv_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Return quantity exceeds invoiced quantity for '{inv_item.product_name}'"
            )

        product = await Product.get(item_in.product_id)
        if product:
            # Restock product
            product.current_stock += item_in.quantity
            await product.save()

            # Ledger entry
            await StockEntry(
                product_id=str(product.id),
                product_name=product.name,
                type=StockEntryType.RETURN,
                quantity=item_in.quantity,
                notes=item_in.reason or f"Return from {invoice.invoice_number}",
                performed_by=str(current_user.id),
                performed_by_name=current_user.name,
            ).insert()

        # Prorated refund calculation: (line_total / sub_total) * grand_total
        item_refund = (inv_item.line_total / invoice.sub_total) * invoice.grand_total
        refund_amount += (item_refund / inv_item.quantity) * item_in.quantity

        return_items.append(ReturnItem(
            product_id=item_in.product_id,
            product_name=inv_item.product_name,
            quantity=item_in.quantity,
            reason=item_in.reason
        ))

    # Use manual override if provided
    final_refund = data.refund_amount if data.refund_amount is not None else refund_amount

    ret = Return(
        invoice_id=str(invoice.id),
        invoice_number=invoice.invoice_number,
        items=return_items,
        refund_amount=round(final_refund, 2),
        refund_method=data.refund_method,
        processed_by=str(current_user.id),
        processed_by_name=current_user.name,
        notes=data.notes,
    )
    await ret.insert()
    return return_out(ret)

@router.get("", dependencies=[Depends(get_current_user)])
async def list_returns():
    returns = await Return.find_all().sort("-created_at").to_list()
    return [return_out(r) for r in returns]

@router.get("/{return_id}", dependencies=[Depends(get_current_user)])
async def get_return(return_id: str):
    ret = await Return.get(return_id)
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    return return_out(ret)
