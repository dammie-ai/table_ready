const { z } = require('zod');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = (error.errors || error.issues || []).map(err => ({
          field: Array.isArray(err.path) ? err.path.join('.') : err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
      });
    }
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = (error.errors || error.issues || []).map(err => ({
          field: Array.isArray(err.path) ? err.path.join('.') : err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters'
      });
    }
  };
};

const schemas = {
  login: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
  }),

  register: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'manager', 'kitchen', 'waiter', 'delivery', 'assistant_manager', 'other']).optional()
  }),

  createOrder: z.object({
    order_type: z.enum(['IN_HOUSE', 'DRIVE_THRU', 'DELIVERY', 'ORDER_FROM_HOME', 'PICKUP', 'DINE_IN']).optional(),
    is_held: z.boolean().optional(),
    table_number: z.number().int().positive().optional(),
    notes: z.string().optional(),
    ordered_by_user_id: z.number().int().positive().optional(),
    idempotency_key: z.string().optional(),
    items: z.array(z.object({
      menu_item_id: z.number().int().positive().optional(),
      item_id: z.number().int().positive().optional(),
      inventory_id: z.number().int().positive().optional(),
      quantity: z.number().int().positive().optional(),
      price: z.number().nonnegative().optional(),
      custom_instructions: z.string().optional(),
      modifiers: z.array(z.object({
        modifier_id: z.number().int().positive(),
        quantity: z.number().int().positive().optional()
      })).optional()
    })).min(1, 'At least one item is required').optional(),
    pickup_scheduled_time: z.string().optional(),
    customer_vehicle: z.string().optional(),
    curbside_lane: z.string().optional()
  }),

  updateOrderStatus: z.object({
    status: z.enum(['RECEIVED', 'IN_PREPARATION', 'COOKING', 'READY', 'READY_FOR_PICKUP', 'PICKED_UP', 'SERVED', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'ASSIGNED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED_AND_REFUNDED']),
    progress_percentage: z.number().int().min(0).max(100).optional()
  }),

  createMenuItem: z.object({
    name: z.string().min(1, 'Item name is required'),
    category_type: z.enum(['Entree', 'Entrée', 'Meat', 'Fish', 'Dessert', 'Combo']),
    description: z.string().optional(),
    base_price: z.number().positive('Price must be greater than 0'),
    stock_quantity: z.number().int().nonnegative().optional(),
    prep_time_minutes: z.number().int().positive().optional(),
    image_url: z.string().url().optional(),
    allergens: z.array(z.string()).optional(),
    custom_sides_array: z.array(z.any()).optional()
  }),

  updateMenuItem: z.object({
    name: z.string().min(1).optional(),
    category_type: z.enum(['Entree', 'Entrée', 'Meat', 'Fish', 'Dessert', 'Combo']).optional(),
    description: z.string().optional(),
    base_price: z.number().positive().optional(),
    stock_quantity: z.number().int().nonnegative().optional(),
    is_active: z.boolean().optional(),
    is_trending: z.boolean().optional(),
    prep_time_minutes: z.number().int().positive().optional(),
    image_url: z.string().url().optional(),
    allergens: z.array(z.string()).optional(),
    custom_sides_array: z.array(z.any()).optional()
  }),

  createSession: z.object({
    table_number: z.number().int().positive(),
    waiter_id: z.number().int().positive(),
    party_size: z.number().int().positive().optional()
  }),

  joinSession: z.object({
    code: z.string().min(1, 'Code is required')
  }),

  addCartItem: z.object({
    menu_item_id: z.number().int().positive().optional(),
    inventory_id: z.number().int().positive().optional(),
    quantity: z.number().int().positive().optional(),
    custom_instructions: z.string().optional()
  }),

  createCart: z.object({
    customer_id: z.number().int().positive().optional(),
    session_token: z.string().optional()
  }),

  checkout: z.object({
    order_type: z.string().optional(),
    table_number: z.number().int().positive().optional(),
    notes: z.string().optional(),
    ordered_by_user_id: z.number().int().positive().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    idempotency_key: z.string().optional()
  }),

  createPaymentIntent: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    currency: z.string().length(3).optional()
  }),

  confirmPayment: z.object({
    paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
    orderId: z.number().int().positive('Order ID must be a positive integer')
  }),

  splitBill: z.object({
    order_id: z.number().int().positive('Order ID must be a positive integer'),
    splits: z.array(z.object({
      index: z.number().int().nonnegative(),
      label: z.string().optional(),
      amount: z.number().positive('Amount must be greater than 0'),
      customer_id: z.number().int().positive().optional()
    })).min(1, 'At least one split is required')
  }),

  joinWaitlist: z.object({
    table_id: z.number().int().positive(),
    customer_name: z.string().min(1, 'Customer name is required'),
    phone: z.string().optional(),
    party_size: z.number().int().positive()
  }),

  createServiceRequest: z.object({
    table_number: z.number().int().positive(),
    request_type: z.enum(['call_server', 'refill', 'bill_request', 'other']),
    notes: z.string().optional(),
    session_id: z.string().uuid().optional()
  }),

  assignDriver: z.object({
    order_id: z.number().int().positive('Order ID must be a positive integer'),
    driver_id: z.number().int().positive('Driver ID must be a positive integer')
  }),

  updateDeliveryStatus: z.object({
    status: z.enum(['assigned', 'accepted', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'])
  }),

  updateDriverLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),

  voidItem: z.object({
    reason: z.string().optional()
  }),

  recordCashPayment: z.object({
    amount: z.number().positive('Amount must be greater than 0')
  }),

  distributeTips: z.object({
    splits: z.array(z.object({
      user_id: z.number().int().positive(),
      percentage: z.number().min(0).max(100).optional(),
      amount: z.number().nonnegative().optional()
    })).min(1, 'At least one split is required')
  }),

  modifyOrderItems: z.object({
    add_items: z.array(z.object({
      menu_item_id: z.number().int().positive().optional(),
      inventory_id: z.number().int().positive().optional(),
      quantity: z.number().int().positive().optional(),
      custom_instructions: z.string().optional()
    })).optional(),
    remove_items: z.array(z.object({
      order_item_id: z.number().int().positive(),
      quantity: z.number().int().positive().optional()
    })).optional()
  }),

  toggleInventory: z.object({
    is_active: z.boolean()
  }),

  logWaste: z.object({
    inventory_id: z.number().int().positive(),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    reason: z.string().optional()
  }),

  inventoryDeduction: z.object({
    items: z.array(z.object({
      inventory_id: z.number().int().positive(),
      quantity: z.number().int().positive('Quantity must be a positive integer')
    })).min(1, 'At least one item is required')
  }),

  addIngredient: z.object({
    inventory_id: z.number().int().positive(),
    quantity_required: z.number().positive('Quantity must be greater than 0')
  }),

  verifyTableCode: z.object({
    table_number: z.number().int().positive(),
    code: z.string().min(1, 'Code is required')
  }),

  verifyLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    check_type: z.string().optional()
  }),

  generateQR: z.object({
    table_number: z.number().int().positive()
  }),

  verifyQRCode: z.object({
    qr_data: z.string().min(1, 'QR data is required'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }),

  updateTableStatus: z.object({
    status_state: z.enum(['Available', 'Occupied', 'Needs Cleaning', 'Reserved', 'Dirty'])
  }),

  createTable: z.object({
    table_number: z.number().int().positive(),
    capacity: z.number().int().positive().optional(),
    section: z.string().optional()
  }),

  overrideDishOfWeek: z.object({
    category_type: z.string().min(1, 'Category type is required'),
    menu_item_id: z.number().int().positive('Menu item ID must be a positive integer'),
    discount_percentage: z.number().min(0).max(100, 'Discount cannot exceed 100%')
  }),

  analyticsQuery: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional()
  }),

  kitchenOrdersQuery: z.object({
    status: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional()
  }),

  createAuditConfig: z.object({
    schedule_type: z.enum(['once', 'daily', 'every_x_days', 'weekly', 'every_x_weeks', 'monthly', 'every_x_months']),
    interval_value: z.number().int().positive().optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional()
  }),

  updateAuditConfig: z.object({
    schedule_type: z.enum(['once', 'daily', 'every_x_days', 'weekly', 'every_x_weeks', 'monthly', 'every_x_months']).optional(),
    interval_value: z.number().int().positive().optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    is_active: z.boolean().optional()
  }),

  createModifier: z.object({
    name: z.string().min(1, 'Modifier name is required'),
    description: z.string().optional(),
    price_adjustment: z.number().default(0.00),
    modifier_type: z.enum(['choice', 'extra', 'removal', 'preparation']).optional(),
    is_active: z.boolean().optional()
  }),

  updateModifier: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price_adjustment: z.number().optional(),
    modifier_type: z.enum(['choice', 'extra', 'removal', 'preparation']).optional(),
    is_active: z.boolean().optional()
  }),

  addModifierToItem: z.object({
    modifier_id: z.number().int().positive('Modifier ID must be a positive integer'),
    is_required: z.boolean().optional(),
    max_quantity: z.number().int().positive().optional(),
    sort_order: z.number().int().nonnegative().optional()
  }),

  refundOrder: z.object({
    reason: z.string().optional()
  }),

  createReservation: z.object({
    customer_name: z.string().min(1, 'Customer name is required'),
    customer_phone: z.string().optional(),
    customer_email: z.string().email().optional(),
    table_id: z.number().int().positive().optional(),
    reservation_date: z.string().min(1, 'Reservation date is required'),
    reservation_time: z.string().min(1, 'Reservation time is required'),
    party_size: z.number().int().positive('Party size must be a positive integer'),
    notes: z.string().optional()
  }),

  updateReservation: z.object({
    customer_name: z.string().min(1).optional(),
    customer_phone: z.string().optional(),
    customer_email: z.string().email().optional(),
    table_id: z.number().int().positive().optional(),
    reservation_date: z.string().optional(),
    reservation_time: z.string().optional(),
    party_size: z.number().int().positive().optional(),
    status: z.enum(['confirmed', 'seated', 'cancelled', 'completed', 'no_show']).optional(),
    notes: z.string().optional()
  }),

  createSchedule: z.object({
    employee_id: z.number().int().positive('Employee ID must be a positive integer'),
    schedule_date: z.string().min(1, 'Schedule date is required'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    role: z.string().optional(),
    is_published: z.boolean().optional(),
    notes: z.string().optional()
  }),

  updateSchedule: z.object({
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    role: z.string().optional(),
    is_published: z.boolean().optional(),
    notes: z.string().optional(),
    schedule_date: z.string().optional()
  }),

  clockInOut: z.object({
    employee_id: z.number().int().positive('Employee ID must be a positive integer'),
    location: z.string().optional(),
    notes: z.string().optional()
  }),

  createSupplier: z.object({
    name: z.string().min(1, 'Supplier name is required'),
    contact_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    tax_id: z.string().optional(),
    payment_terms: z.string().optional(),
    is_active: z.boolean().optional()
  }),

  updateSupplier: z.object({
    name: z.string().min(1).optional(),
    contact_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    tax_id: z.string().optional(),
    payment_terms: z.string().optional(),
    is_active: z.boolean().optional()
  }),

  createPurchaseOrder: z.object({
    supplier_id: z.number().int().positive('Supplier ID must be a positive integer'),
    expected_delivery_date: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
      inventory_id: z.number().int().positive('Inventory ID must be a positive integer'),
      quantity_ordered: z.number().positive('Quantity must be greater than 0'),
      unit_cost: z.number().positive('Unit cost must be greater than 0').optional(),
      notes: z.string().optional()
    })).min(1, 'At least one item is required')
  }),

  updatePurchaseOrderStatus: z.object({
    status: z.enum(['draft', 'sent', 'confirmed', 'shipped', 'received', 'cancelled', 'partially_received'])
  }),

  receivePurchaseOrder: z.object({
    items: z.array(z.object({
      purchase_order_item_id: z.number().int().positive(),
      quantity_received: z.number().nonnegative()
    })).min(1, 'At least one item is required')
  }),

  createReorderRule: z.object({
    inventory_id: z.number().int().positive('Inventory ID must be a positive integer'),
    supplier_id: z.number().int().positive().optional(),
    reorder_quantity: z.number().positive('Reorder quantity must be greater than 0'),
    min_quantity: z.number().positive('Min quantity must be greater than 0'),
    is_enabled: z.boolean().optional()
  }),

  updateReorderRule: z.object({
    reorder_quantity: z.number().positive().optional(),
    min_quantity: z.number().positive().optional(),
    is_enabled: z.boolean().optional()
  }),

  createNotificationTemplate: z.object({
    name: z.string().min(1, 'Template name is required'),
    channel: z.enum(['email', 'sms', 'push', 'in_app']),
    event_type: z.string().min(1, 'Event type is required'),
    subject_template: z.string().optional(),
    body_template: z.string().min(1, 'Body template is required')
  }),

  updateNotificationTemplate: z.object({
    name: z.string().min(1).optional(),
    channel: z.enum(['email', 'sms', 'push', 'in_app']).optional(),
    event_type: z.string().min(1).optional(),
    subject_template: z.string().optional(),
    body_template: z.string().min(1).optional(),
    is_active: z.boolean().optional()
  }),

  sendTestNotification: z.object({
    channel: z.enum(['email', 'sms', 'push', 'in_app']),
    recipient: z.string().min(1, 'Recipient is required'),
    template_id: z.number().int().positive().optional(),
    subject: z.string().optional(),
    body: z.string().min(1, 'Body is required'),
    related_entity_type: z.string().optional(),
    related_entity_id: z.number().int().positive().optional()
  }),

  createTaxJurisdiction: z.object({
    name: z.string().min(1, 'Jurisdiction name is required'),
    jurisdiction_type: z.enum(['country', 'state', 'county', 'city', 'special']),
    parent_jurisdiction_id: z.number().int().positive().optional(),
    code: z.string().optional(),
    is_active: z.boolean().optional(),
    effective_date: z.string().optional(),
    end_date: z.string().optional()
  }),

  createTaxRate: z.object({
    jurisdiction_id: z.number().int().positive('Jurisdiction ID must be a positive integer'),
    name: z.string().min(1, 'Tax rate name is required'),
    rate_percentage: z.number().positive('Rate must be greater than 0'),
    applies_to: z.enum(['all', 'food', 'alcohol', 'merchandise', 'delivery', 'service']).optional(),
    is_tax_inclusive: z.boolean().optional(),
    is_active: z.boolean().optional(),
    effective_date: z.string().optional(),
    end_date: z.string().optional()
  }),

  createTaxExemption: z.object({
    customer_id: z.number().int().positive().optional(),
    organization_name: z.string().min(1, 'Organization name is required'),
    exemption_number: z.string().min(1, 'Exemption number is required'),
    jurisdiction_id: z.number().int().positive('Jurisdiction ID must be a positive integer'),
    expires_at: z.string().optional()
  }),

  updateNotificationPreferences: z.object({
    customer_id: z.number().int().positive().optional(),
    session_token: z.string().optional(),
    preferences: z.array(z.object({
      channel: z.string().min(1),
      event_type: z.string().min(1),
      is_enabled: z.boolean()
    })).min(1, 'At least one preference is required')
  })
};

module.exports = {
  validate,
  validateQuery,
  schemas
};
