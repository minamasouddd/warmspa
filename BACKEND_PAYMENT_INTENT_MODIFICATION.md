# Backend Payment Intent Modification Guide

## Overview
The payment intent endpoint needs to be modified to return the `orderId` in the response, allowing the frontend to fetch order details after successful payment.

## Current Endpoint
- **Route**: `POST /api/v1/orders/create-payment-intent/:branchId/:productId`
- **Current Response**:
```json
{
  "redirectLink": "https://checkout.stripe.com/..."
}
```

## Required Modification

### New Response Format
The endpoint should return:
```json
{
  "status": "success",
  "redirectLink": "https://checkout.stripe.com/c/pay/cs_test_...",
  "orderId": "691f7eec3b2e29788f996372",
  "paymentIntentId": "pi_3SVdsWKKYdZVJLaa1szwyFbW"
}
```

OR (simpler version):
```json
{
  "redirectLink": "https://checkout.stripe.com/c/pay/cs_test_...",
  "orderId": "691f7eec3b2e29788f996372"
}
```

## Implementation Steps

### 1. Find the Payment Intent Controller
Look for the controller handling `POST /api/v1/orders/create-payment-intent/:branchId/:productId`

Typical location:
- `src/controllers/orders.controller.ts` or
- `src/routes/orders.routes.ts`

### 2. Locate the Order Creation Logic
The endpoint should already be creating an order. Find where the order is created and saved to the database.

Example (Node.js/Express with MongoDB):
```typescript
const order = new Order({
  user: userId,
  branch: branchId,
  items: [...],
  totalAmount: price,
  status: 'pending',
  paymentStatus: 'pending',
  // ... other fields
});

const savedOrder = await order.save();
```

### 3. Modify the Response to Include orderId

**Before**:
```typescript
return res.status(200).json({
  redirectLink: checkoutSession.url
});
```

**After**:
```typescript
return res.status(200).json({
  status: 'success',
  redirectLink: checkoutSession.url,
  orderId: savedOrder._id.toString(),
  paymentIntentId: paymentIntent.id
});
```

### 4. Complete Example Implementation

If your controller looks something like this:

```typescript
exports.createPaymentIntent = async (req, res) => {
  try {
    const { branchId, productId } = req.params;
    const { date, name, price, address } = req.body;
    const userId = req.user._id;

    // 1. Create the order
    const order = new Order({
      user: userId,
      branch: branchId,
      items: [{
        service: productId,
        quantity: 1,
        price: price
      }],
      totalAmount: price,
      status: 'pending',
      paymentStatus: 'pending',
      date: date,
      paymentMethod: 'stripe'
    });

    const savedOrder = await order.save();

    // 2. Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100),
      currency: 'usd',
      metadata: {
        orderId: savedOrder._id.toString(),
        userId: userId.toString()
      }
    });

    // 3. Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: name
          },
          unit_amount: Math.round(price * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: 'https://warm-spa.vercel.app/payment-success',
      cancel_url: 'https://warm-spa.vercel.app/booking',
      metadata: {
        orderId: savedOrder._id.toString(),
        userId: userId.toString()
      }
    });

    // 4. Update order with payment intent ID
    savedOrder.paymentIntentId = paymentIntent.id;
    await savedOrder.save();

    // 5. Return response WITH orderId
    return res.status(200).json({
      status: 'success',
      redirectLink: checkoutSession.url,
      orderId: savedOrder._id.toString(),
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Payment Intent Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
```

## Key Points

1. **Order Creation**: The order must be created BEFORE the payment intent
2. **Save Order**: Save the order to the database to get the `_id`
3. **Return orderId**: Include `orderId: savedOrder._id.toString()` in the response
4. **Metadata**: Store orderId in Stripe metadata for webhook handling
5. **Type Conversion**: Convert MongoDB ObjectId to string using `.toString()`

## Testing

After implementing the backend changes, test with:

```bash
curl -X POST https://warm-spa.vercel.app/api/v1/orders/create-payment-intent/68f3c732d79f88db780b9154/69008ac35cd67cfd57527db9 \
  -H "Authorization: User YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "68f3c732d79f88db780b9154",
    "productId": "69008ac35cd67cfd57527db9",
    "date": "2025-12-15T14:00:00Z",
    "name": "Service Name",
    "price": 100,
    "address": "test"
  }'
```

Expected response:
```json
{
  "status": "success",
  "redirectLink": "https://checkout.stripe.com/c/pay/cs_test_...",
  "orderId": "691f7eec3b2e29788f996372",
  "paymentIntentId": "pi_3SVdsWKKYdZVJLaa1szwyFbW"
}
```

## Frontend Changes (Already Completed)

The frontend has been updated to:
1. ✅ Store `orderId` in sessionStorage when received
2. ✅ Fetch order details on payment success page using `getOrderById(orderId)`
3. ✅ Display order information to the user

## Files Modified

### Frontend
- `src/app/Pages/booking/booking.ts` - Stores orderId from payment response
- `src/app/Pages/payment-success/payment-success.component.ts` - Fetches order details using orderId
- `src/app/services/orders.service.ts` - Added `getOrderById()` method

### Backend (To be modified)
- `src/controllers/orders.controller.ts` or equivalent
- Update the `createPaymentIntent` endpoint to return `orderId`
