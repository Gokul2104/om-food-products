from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from models.invoice import Invoice, InvoiceItem, PaymentMethod, PaymentStatus
from models.product import Product
from models.stock_entry import StockEntry, StockEntryType
from models.user import User, UserRole
from core.security import require_roles, get_current_user
from datetime import datetime, date, timezone

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])

biller_or_admin = require_roles(UserRole.admin, UserRole.biller)

class InvoiceItemIn(BaseModel):
    product_id: str
    quantity: float

class InvoiceCreate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[InvoiceItemIn]
    global_discount: float = 0.0
    payment_method: PaymentMethod = PaymentMethod.cash
    payment_status: PaymentStatus = PaymentStatus.paid
    paid_amount: Optional[float] = None

async def generate_invoice_number() -> str:
    now_utc = datetime.now(timezone.utc)
    today = now_utc.strftime("%Y%m%d")
    count = await Invoice.find(
        Invoice.created_at >= datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)
    ).count()
    return f"INV-{today}-{count + 1:04d}"

def invoice_out(inv: Invoice):
    return {
        "id": str(inv.id),
        "invoice_number": inv.invoice_number,
        "customer_name": inv.customer_name,
        "customer_phone": inv.customer_phone,
        "items": [i.dict() for i in inv.items],
        "sub_total": inv.sub_total,
        "global_discount": inv.global_discount,
        "tax_amount": inv.tax_amount,
        "grand_total": inv.grand_total,
        "payment_method": inv.payment_method,
        "payment_status": inv.payment_status,
        "paid_amount": inv.paid_amount,
        "created_by_name": inv.created_by_name,
        "created_at": inv.created_at
    }

@router.post("", dependencies=[Depends(biller_or_admin)], status_code=201)
async def create_invoice(data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    invoice_items = []
    sub_total = 0.0
    discount_total = 0.0
    tax_amount = 0.0

    for item_in in data.items:
        product = await Product.get(item_in.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")
        if product.current_stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.current_stock}"
            )

        line_total = product.selling_price * item_in.quantity
        sub_total += line_total
        tax_amount += line_total * (product.tax_rate / 100)

        invoice_items.append(InvoiceItem(
            product_id=str(product.id),
            product_name=product.name,
            quantity=item_in.quantity,
            unit_price=product.selling_price,
            tax_rate=product.tax_rate,
            line_total=line_total,
            remaining_stock=product.current_stock
        ))

        # Deduct stock
        product.current_stock -= item_in.quantity
        await product.save()

        # Ledger entry
        await StockEntry(
            product_id=str(product.id),
            product_name=product.name,
            type=StockEntryType.OUT,
            quantity=item_in.quantity,
            notes=f"Sale",
            performed_by=str(current_user.id),
            performed_by_name=current_user.name,
        ).insert()

    # Calculate final tax and grand total
    # If there's a global discount, we should apply it pre-tax for accuracy.
    # We'll calculate the 'effective' tax by reducing the tax proportionally.
    if sub_total > 0 and data.global_discount > 0:
        # Calculate weighted average tax rate
        weighted_tax_rate = tax_amount / sub_total
        # Reduce tax_amount proportionally based on the discount
        tax_amount = (sub_total - data.global_discount) * weighted_tax_rate
    
    grand_total = (sub_total - data.global_discount) + tax_amount
    paid_amount = data.paid_amount if data.paid_amount is not None else grand_total

    # Update payment status if partial or credit
    actual_status = data.payment_status
    if paid_amount < grand_total:
        actual_status = PaymentStatus.partial
    if paid_amount == 0:
        actual_status = PaymentStatus.pending

    invoice = Invoice(
        invoice_number=await generate_invoice_number(),
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        items=invoice_items,
        sub_total=sub_total,
        global_discount=data.global_discount,
        tax_amount=tax_amount,
        grand_total=grand_total,
        payment_method=data.payment_method,
        payment_status=actual_status,
        paid_amount=paid_amount,
        created_by=str(current_user.id),
        created_by_name=current_user.name,
    )
    await invoice.insert()
    return invoice_out(invoice)

@router.get("", dependencies=[Depends(get_current_user)])
async def list_invoices(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    payment_status: Optional[PaymentStatus] = Query(None),
    search: Optional[str] = Query(None)
):
    invoices = await Invoice.find_all().sort("-created_at").to_list()
    result = []
    for inv in invoices:
        if date_from:
            df = datetime.fromisoformat(date_from)
            if inv.created_at < df:
                continue
        if date_to:
            dt = datetime.fromisoformat(date_to)
            if inv.created_at > dt:
                continue
        if payment_status and inv.payment_status != payment_status:
            continue
        if search:
            s = search.lower()
            if s not in (inv.invoice_number or "").lower() and s not in (inv.customer_name or "").lower() and s not in (inv.customer_phone or "").lower():
                continue
        result.append(invoice_out(inv))
    return result

@router.get("/{invoice_id}", dependencies=[Depends(get_current_user)])
async def get_invoice(invoice_id: str):
    inv = await Invoice.get(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice_out(inv)
