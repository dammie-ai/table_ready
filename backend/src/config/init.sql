--
-- PostgreSQL database dump
--


-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    actor_id integer,
    actor_username character varying(100) DEFAULT NULL::character varying,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    old_value text,
    new_value text,
    ip_address character varying(45) DEFAULT NULL::character varying,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    cart_item_id integer NOT NULL,
    cart_id integer NOT NULL,
    menu_item_id integer,
    inventory_id integer,
    quantity integer DEFAULT 1 NOT NULL,
    custom_instructions text,
    unit_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modifiers jsonb DEFAULT '[]'::jsonb
);


--
-- Name: cart_items_cart_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_cart_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_cart_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_cart_item_id_seq OWNED BY public.cart_items.cart_item_id;


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    cart_id integer NOT NULL,
    customer_id integer,
    session_token character varying(255) DEFAULT NULL::character varying,
    status character varying(30) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT carts_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'checked_out'::character varying, 'abandoned'::character varying])::text[])))
);


--
-- Name: carts_cart_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carts_cart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carts_cart_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carts_cart_id_seq OWNED BY public.carts.cart_id;


--
-- Name: combo_meal_sides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_meal_sides (
    combo_side_id integer NOT NULL,
    combo_id integer NOT NULL,
    menu_item_id integer NOT NULL,
    is_default boolean DEFAULT false,
    sort_order integer DEFAULT 0
);


--
-- Name: combo_meal_sides_combo_side_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combo_meal_sides_combo_side_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combo_meal_sides_combo_side_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combo_meal_sides_combo_side_id_seq OWNED BY public.combo_meal_sides.combo_side_id;


--
-- Name: combo_meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_meals (
    combo_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    base_price numeric(10,2) NOT NULL,
    image_url character varying(500),
    required_main_category character varying(100) NOT NULL,
    max_sides integer DEFAULT 2 NOT NULL,
    sides_category character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: combo_meals_combo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combo_meals_combo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combo_meals_combo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combo_meals_combo_id_seq OWNED BY public.combo_meals.combo_id;


--
-- Name: customer_favorite_combos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_favorite_combos (
    combo_id integer NOT NULL,
    customer_id integer NOT NULL,
    combo_name character varying(100) DEFAULT 'The Usual'::character varying,
    item_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    quantities jsonb DEFAULT '[]'::jsonb NOT NULL,
    order_count integer DEFAULT 1,
    last_ordered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_favorite_combos_combo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_favorite_combos_combo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_favorite_combos_combo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_favorite_combos_combo_id_seq OWNED BY public.customer_favorite_combos.combo_id;


--
-- Name: customer_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_notification_preferences (
    preference_id integer NOT NULL,
    customer_id integer,
    session_token character varying(255) DEFAULT NULL::character varying,
    channel character varying(30) NOT NULL,
    event_type character varying(50) NOT NULL,
    is_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_notification_preferences_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'push'::character varying, 'in_app'::character varying])::text[])))
);


--
-- Name: customer_notification_preferences_preference_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_notification_preferences_preference_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_notification_preferences_preference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_notification_preferences_preference_id_seq OWNED BY public.customer_notification_preferences.preference_id;


--
-- Name: customer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_profiles (
    customer_id integer NOT NULL,
    email character varying(100) DEFAULT NULL::character varying,
    phone character varying(20) DEFAULT NULL::character varying,
    first_name character varying(100) DEFAULT NULL::character varying,
    last_name character varying(100) DEFAULT NULL::character varying,
    preferred_language character varying(10) DEFAULT 'en'::character varying,
    preferred_fulfillment character varying(30) DEFAULT NULL::character varying,
    max_delivery_distance_miles integer DEFAULT 10,
    is_guest boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_profiles_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_profiles_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_profiles_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_profiles_customer_id_seq OWNED BY public.customer_profiles.customer_id;


--
-- Name: customer_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_sessions (
    session_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id integer,
    device_token character varying(255) DEFAULT NULL::character varying,
    session_token character varying(255) NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dish_of_week_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dish_of_week_config (
    config_id integer NOT NULL,
    category_type character varying(30) NOT NULL,
    menu_item_id integer,
    discount_percentage numeric(5,2) DEFAULT 14.00 NOT NULL,
    is_override boolean DEFAULT false,
    set_by integer,
    period_start date,
    period_end date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dish_of_week_config_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dish_of_week_config_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dish_of_week_config_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dish_of_week_config_config_id_seq OWNED BY public.dish_of_week_config.config_id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    employee_id integer NOT NULL,
    name character varying(100) NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(30) NOT NULL,
    allowed_days_mask integer DEFAULT 127 NOT NULL,
    account_lock_status boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employees_role_check CHECK (((role)::text = ANY ((ARRAY['Manager'::character varying, 'Admin'::character varying, 'Assistant Manager'::character varying, 'Kitchen'::character varying, 'Delivery'::character varying, 'Waiter'::character varying, 'Other'::character varying])::text[])))
);


--
-- Name: employees_employee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_employee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_employee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_employee_id_seq OWNED BY public.employees.employee_id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    sku character varying(100) NOT NULL,
    item_name character varying(255) NOT NULL,
    base_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    reorder_threshold integer DEFAULT 10 NOT NULL,
    unit character varying(50) DEFAULT 'units'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: low_stock_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.low_stock_alerts (
    alert_id integer NOT NULL,
    inventory_id integer,
    current_stock integer NOT NULL,
    threshold integer NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying,
    acknowledged_by integer,
    acknowledged_at timestamp without time zone,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT low_stock_alerts_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'acknowledged'::character varying, 'resolved'::character varying])::text[])))
);


--
-- Name: low_stock_alerts_alert_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.low_stock_alerts_alert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: low_stock_alerts_alert_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.low_stock_alerts_alert_id_seq OWNED BY public.low_stock_alerts.alert_id;


--
-- Name: menu_item_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_ingredients (
    id integer NOT NULL,
    menu_item_id integer NOT NULL,
    inventory_id integer NOT NULL,
    quantity_required numeric(10,2) DEFAULT 1.00 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT menu_item_ingredients_quantity_required_check CHECK ((quantity_required > (0)::numeric))
);


--
-- Name: menu_item_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_item_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_item_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_item_ingredients_id_seq OWNED BY public.menu_item_ingredients.id;


--
-- Name: menu_item_modifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_modifiers (
    item_modifier_id integer NOT NULL,
    menu_item_id integer NOT NULL,
    modifier_id integer NOT NULL,
    is_required boolean DEFAULT false,
    max_quantity integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: menu_item_modifiers_item_modifier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_item_modifiers_item_modifier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_item_modifiers_item_modifier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_item_modifiers_item_modifier_id_seq OWNED BY public.menu_item_modifiers.item_modifier_id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    item_id integer NOT NULL,
    name character varying(150) NOT NULL,
    category_type character varying(30) NOT NULL,
    description text,
    base_price numeric(10,2) NOT NULL,
    stock_quantity integer DEFAULT 0,
    out_of_stock_flag boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_trending boolean DEFAULT false,
    prep_time_minutes integer DEFAULT 10,
    allergens character varying(50)[] DEFAULT '{}'::character varying[],
    custom_sides_array jsonb DEFAULT '[]'::jsonb,
    image_url character varying(255) DEFAULT NULL::character varying,
    CONSTRAINT menu_items_category_type_check CHECK (((category_type)::text = ANY ((ARRAY['Entree'::character varying, 'Entrée'::character varying, 'Meat'::character varying, 'Fish'::character varying, 'Dessert'::character varying, 'Combo'::character varying])::text[])))
);


--
-- Name: menu_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_items_item_id_seq OWNED BY public.menu_items.item_id;


--
-- Name: menu_modifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_modifiers (
    modifier_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price_adjustment numeric(10,2) DEFAULT 0.00 NOT NULL,
    modifier_type character varying(30) DEFAULT 'choice'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT menu_modifiers_modifier_type_check CHECK (((modifier_type)::text = ANY ((ARRAY['choice'::character varying, 'extra'::character varying, 'removal'::character varying, 'preparation'::character varying])::text[])))
);


--
-- Name: menu_modifiers_modifier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_modifiers_modifier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_modifiers_modifier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_modifiers_modifier_id_seq OWNED BY public.menu_modifiers.modifier_id;


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    notification_log_id integer NOT NULL,
    template_id integer,
    channel character varying(30) NOT NULL,
    recipient character varying(255) NOT NULL,
    subject text,
    body text NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying,
    error_message text,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    opened_at timestamp without time zone,
    clicked_at timestamp without time zone,
    related_entity_type character varying(50) DEFAULT NULL::character varying,
    related_entity_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notification_logs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'delivered'::character varying, 'failed'::character varying, 'bounced'::character varying])::text[])))
);


--
-- Name: notification_logs_notification_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_logs_notification_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_logs_notification_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_logs_notification_log_id_seq OWNED BY public.notification_logs.notification_log_id;


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    template_id integer NOT NULL,
    name character varying(100) NOT NULL,
    channel character varying(30) NOT NULL,
    event_type character varying(50) NOT NULL,
    subject_template text,
    body_template text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notification_templates_channel_check CHECK (((channel)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'push'::character varying, 'in_app'::character varying])::text[])))
);


--
-- Name: notification_templates_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_templates_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_templates_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_templates_template_id_seq OWNED BY public.notification_templates.template_id;


--
-- Name: order_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_assignments (
    assignment_id integer NOT NULL,
    order_id integer NOT NULL,
    assigned_to integer NOT NULL,
    assigned_by integer,
    status character varying(30) DEFAULT 'assigned'::character varying,
    accepted_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'accepted'::character varying, 'picked_up'::character varying, 'out_for_delivery'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: order_assignments_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_assignments_assignment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_assignments_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_assignments_assignment_id_seq OWNED BY public.order_assignments.assignment_id;


--
-- Name: order_cook_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_cook_tracking (
    tracking_id integer NOT NULL,
    order_item_id integer NOT NULL,
    master_order_id integer NOT NULL,
    estimated_cook_minutes integer DEFAULT 10 NOT NULL,
    actual_cook_minutes integer,
    status character varying(30) DEFAULT 'pending'::character varying,
    held_until timestamp without time zone,
    cooking_started_at timestamp without time zone,
    overdue_notified boolean DEFAULT false,
    overdue_notified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_cook_tracking_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'cooking'::character varying, 'ready'::character varying, 'held'::character varying, 'overdue'::character varying, 'bumped'::character varying])::text[])))
);


--
-- Name: order_cook_tracking_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_cook_tracking_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_cook_tracking_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_cook_tracking_tracking_id_seq OWNED BY public.order_cook_tracking.tracking_id;


--
-- Name: order_discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_discounts (
    discount_id integer NOT NULL,
    master_order_id integer NOT NULL,
    order_item_id integer,
    discount_type character varying(30) NOT NULL,
    discount_percentage numeric(5,2) NOT NULL,
    discount_amount numeric(10,2) NOT NULL,
    menu_item_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_discounts_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['dish_of_week_category'::character varying, 'dish_of_week_overall'::character varying, 'promo'::character varying, 'custom'::character varying])::text[])))
);


--
-- Name: order_discounts_discount_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_discounts_discount_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_discounts_discount_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_discounts_discount_id_seq OWNED BY public.order_discounts.discount_id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    order_item_id integer NOT NULL,
    master_order_id integer,
    item_id integer,
    quantity integer DEFAULT 1,
    ordered_by_user_id integer NOT NULL,
    custom_instructions text,
    has_allergy_alert boolean DEFAULT false,
    item_status character varying(30) DEFAULT 'Received'::character varying,
    modifiers jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT order_items_item_status_check CHECK (((item_status)::text = ANY ((ARRAY['Received'::character varying, 'Preparing'::character varying, 'Ready'::character varying, 'Bumped'::character varying])::text[])))
);


--
-- Name: order_items_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_order_item_id_seq OWNED BY public.order_items.order_item_id;


--
-- Name: order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_payments (
    payment_id integer NOT NULL,
    master_order_id integer NOT NULL,
    payment_method character varying(30) NOT NULL,
    amount numeric(10,2) NOT NULL,
    stripe_payment_intent_id character varying(255) DEFAULT NULL::character varying,
    status character varying(30) DEFAULT 'pending'::character varying,
    paid_by_customer_id integer,
    paid_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['stripe'::character varying, 'cash'::character varying, 'gift_card'::character varying, 'other'::character varying, 'tip'::character varying])::text[]))),
    CONSTRAINT order_payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: order_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_payments_payment_id_seq OWNED BY public.order_payments.payment_id;


--
-- Name: order_tax_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_tax_details (
    order_tax_detail_id integer NOT NULL,
    master_order_id integer NOT NULL,
    jurisdiction_id integer,
    tax_rate_id integer,
    taxable_amount numeric(12,2) NOT NULL,
    tax_rate numeric(5,4) NOT NULL,
    tax_amount numeric(12,2) NOT NULL,
    tax_type character varying(30) DEFAULT 'sales'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_tax_details_tax_type_check CHECK (((tax_type)::text = ANY ((ARRAY['sales'::character varying, 'use'::character varying, 'vat'::character varying, 'gst'::character varying, 'hst'::character varying])::text[])))
);


--
-- Name: order_tax_details_order_tax_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_tax_details_order_tax_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_tax_details_order_tax_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_tax_details_order_tax_detail_id_seq OWNED BY public.order_tax_details.order_tax_detail_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    master_order_id integer NOT NULL,
    customer_id integer,
    status character varying(30) DEFAULT 'RECEIVED'::character varying,
    is_held boolean DEFAULT false,
    total_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    order_type character varying(30) DEFAULT 'IN_HOUSE'::character varying,
    table_number integer,
    notes text,
    progress_percentage integer DEFAULT 0,
    payment_status character varying(30) DEFAULT 'Pending'::character varying,
    tax_calculation numeric(10,2) DEFAULT 0.00,
    tip_value numeric(10,2) DEFAULT 0.00,
    refund_eligible boolean DEFAULT true,
    stripe_charge_id character varying(255) DEFAULT NULL::character varying,
    idempotency_key character varying(255) DEFAULT NULL::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pickup_scheduled_time timestamp without time zone,
    pickup_actual_time timestamp without time zone,
    customer_vehicle character varying(100) DEFAULT NULL::character varying,
    curbside_lane character varying(50) DEFAULT NULL::character varying,
    order_held_until_arrival boolean DEFAULT false,
    pickup_code character varying(6) DEFAULT NULL::character varying,
    pickup_notified boolean DEFAULT false,
    delivery_status character varying(30) DEFAULT NULL::character varying,
    driver_latitude numeric(10,7) DEFAULT NULL::numeric,
    driver_longitude numeric(10,7) DEFAULT NULL::numeric,
    subtotal numeric(12,2) DEFAULT 0.00,
    tax_total numeric(12,2) DEFAULT 0.00,
    tax_inclusive boolean DEFAULT false,
    tax_exemption_id integer,
    payment_method character varying(20) DEFAULT 'card'::character varying NOT NULL,
    CONSTRAINT orders_delivery_status_check CHECK (((delivery_status)::text = ANY ((ARRAY['pending'::character varying, 'assigned'::character varying, 'accepted'::character varying, 'picked_up'::character varying, 'out_for_delivery'::character varying, 'delivered'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['Pending'::character varying, 'Paid'::character varying, 'Refunded'::character varying, 'Failed'::character varying, 'PartiallyPaid'::character varying])::text[])))
);


--
-- Name: orders_master_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_master_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_master_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_master_order_id_seq OWNED BY public.orders.master_order_id;


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    promotion_id integer NOT NULL,
    type character varying(50) NOT NULL,
    menu_item_id integer,
    active boolean DEFAULT true NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promotions_promotion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotions_promotion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotions_promotion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotions_promotion_id_seq OWNED BY public.promotions.promotion_id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    purchase_order_item_id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    inventory_id integer NOT NULL,
    quantity_ordered numeric(10,2) NOT NULL,
    quantity_received numeric(10,2) DEFAULT 0,
    unit_cost numeric(10,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_order_items_purchase_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_purchase_order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_purchase_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_purchase_order_item_id_seq OWNED BY public.purchase_order_items.purchase_order_item_id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    purchase_order_id integer NOT NULL,
    supplier_id integer NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_delivery_date date,
    received_date date,
    status character varying(30) DEFAULT 'draft'::character varying,
    total_amount numeric(12,2) DEFAULT 0.00,
    tax_amount numeric(12,2) DEFAULT 0.00,
    shipping_cost numeric(12,2) DEFAULT 0.00,
    grand_total numeric(12,2) DEFAULT 0.00,
    notes text,
    created_by_user_id integer,
    approved_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_orders_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'received'::character varying, 'cancelled'::character varying, 'partially_received'::character varying])::text[])))
);


--
-- Name: purchase_orders_purchase_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_purchase_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_purchase_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_purchase_order_id_seq OWNED BY public.purchase_orders.purchase_order_id;


--
-- Name: reorder_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reorder_rules (
    reorder_rule_id integer NOT NULL,
    inventory_id integer NOT NULL,
    supplier_id integer,
    reorder_quantity numeric(10,2) NOT NULL,
    min_quantity numeric(10,2) NOT NULL,
    is_enabled boolean DEFAULT true,
    last_ordered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: reorder_rules_reorder_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reorder_rules_reorder_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reorder_rules_reorder_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reorder_rules_reorder_rule_id_seq OWNED BY public.reorder_rules.reorder_rule_id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    reservation_id integer NOT NULL,
    customer_name character varying(100) NOT NULL,
    customer_phone character varying(20) DEFAULT NULL::character varying,
    customer_email character varying(100) DEFAULT NULL::character varying,
    table_id integer,
    reservation_date date NOT NULL,
    reservation_time time without time zone NOT NULL,
    party_size integer DEFAULT 2 NOT NULL,
    status character varying(30) DEFAULT 'confirmed'::character varying,
    notes text,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reservations_status_check CHECK (((status)::text = ANY ((ARRAY['confirmed'::character varying, 'seated'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'no_show'::character varying])::text[])))
);


--
-- Name: reservations_reservation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reservations_reservation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservations_reservation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservations_reservation_id_seq OWNED BY public.reservations.reservation_id;


--
-- Name: restaurant_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_config (
    config_key character varying(100) NOT NULL,
    config_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: restaurant_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_tables (
    table_id integer NOT NULL,
    table_number integer NOT NULL,
    status_state character varying(30) DEFAULT 'Available'::character varying,
    active_pin character varying(4) DEFAULT NULL::character varying,
    pin_expires_at timestamp without time zone,
    waitlist_queue_array integer[] DEFAULT '{}'::integer[],
    capacity integer DEFAULT 4,
    reservation_time timestamp without time zone,
    section character varying(50) DEFAULT 'main'::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT restaurant_tables_status_state_check CHECK (((status_state)::text = ANY ((ARRAY['Available'::character varying, 'Occupied'::character varying, 'Needs Cleaning'::character varying, 'Reserved'::character varying, 'Dirty'::character varying])::text[])))
);


--
-- Name: restaurant_tables_table_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restaurant_tables_table_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restaurant_tables_table_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restaurant_tables_table_id_seq OWNED BY public.restaurant_tables.table_id;


--
-- Name: sales_audit_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_audit_config (
    config_id integer NOT NULL,
    schedule_type character varying(30) NOT NULL,
    interval_value integer DEFAULT 1,
    day_of_week integer,
    day_of_month integer,
    hour integer DEFAULT 0,
    minute integer DEFAULT 0,
    is_active boolean DEFAULT true,
    last_run timestamp without time zone,
    next_run timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_audit_config_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 31))),
    CONSTRAINT sales_audit_config_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT sales_audit_config_hour_check CHECK (((hour >= 0) AND (hour <= 23))),
    CONSTRAINT sales_audit_config_minute_check CHECK (((minute >= 0) AND (minute <= 59))),
    CONSTRAINT sales_audit_config_schedule_type_check CHECK (((schedule_type)::text = ANY ((ARRAY['once'::character varying, 'daily'::character varying, 'every_x_days'::character varying, 'weekly'::character varying, 'every_x_weeks'::character varying, 'monthly'::character varying, 'every_x_months'::character varying])::text[])))
);


--
-- Name: sales_audit_config_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_audit_config_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_audit_config_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_audit_config_config_id_seq OWNED BY public.sales_audit_config.config_id;


--
-- Name: sales_audit_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_audit_results (
    result_id integer NOT NULL,
    config_id integer,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    top_item_id integer,
    top_item_name character varying(150),
    top_item_quantity integer DEFAULT 0,
    top_item_revenue numeric(10,2) DEFAULT 0.00,
    total_revenue numeric(10,2) DEFAULT 0.00,
    total_orders integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sales_audit_results_result_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_audit_results_result_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_audit_results_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_audit_results_result_id_seq OWNED BY public.sales_audit_results.result_id;


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedules (
    schedule_id integer NOT NULL,
    employee_id integer NOT NULL,
    schedule_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    role character varying(30) DEFAULT NULL::character varying,
    is_published boolean DEFAULT true,
    notes text,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schedules_role_check CHECK (((role)::text = ANY ((ARRAY['Manager'::character varying, 'Admin'::character varying, 'Assistant Manager'::character varying, 'Kitchen'::character varying, 'Delivery'::character varying, 'Waiter'::character varying, 'Other'::character varying])::text[])))
);


--
-- Name: schedules_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedules_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedules_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedules_schedule_id_seq OWNED BY public.schedules.schedule_id;


--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_requests (
    request_id integer NOT NULL,
    table_number integer NOT NULL,
    session_id uuid,
    request_type character varying(30) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying,
    notes text,
    created_by_customer boolean DEFAULT true,
    acknowledged_by integer,
    acknowledged_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['call_server'::character varying, 'refill'::character varying, 'bill_request'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT service_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'acknowledged'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: service_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_requests_request_id_seq OWNED BY public.service_requests.request_id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    table_number integer NOT NULL,
    waiter_id integer,
    code character varying(4) DEFAULT NULL::character varying,
    party_size integer DEFAULT 1,
    status character varying(30) DEFAULT 'active'::character varying,
    ended_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verification_code character varying(6) DEFAULT NULL::character varying,
    verification_attempts integer DEFAULT 0,
    verification_verified boolean DEFAULT false,
    CONSTRAINT sessions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key character varying(50) NOT NULL,
    value character varying(255) NOT NULL
);


--
-- Name: stock_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_logs (
    id integer NOT NULL,
    inventory_id integer,
    new_quantity integer DEFAULT 0 NOT NULL,
    change_amount integer DEFAULT 0 NOT NULL,
    reason character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_logs_id_seq OWNED BY public.stock_logs.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    supplier_id integer NOT NULL,
    name character varying(150) NOT NULL,
    contact_name character varying(100) DEFAULT NULL::character varying,
    email character varying(100) DEFAULT NULL::character varying,
    phone character varying(20) DEFAULT NULL::character varying,
    address text,
    tax_id character varying(50) DEFAULT NULL::character varying,
    payment_terms character varying(100) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_supplier_id_seq OWNED BY public.suppliers.supplier_id;


--
-- Name: surge_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surge_tiers (
    id integer NOT NULL,
    min_orders integer NOT NULL,
    max_orders integer,
    multiplier numeric(4,2) NOT NULL
);


--
-- Name: surge_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surge_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: surge_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.surge_tiers_id_seq OWNED BY public.surge_tiers.id;


--
-- Name: table_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_sessions (
    session_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    table_id integer,
    is_group_setup boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tax_exemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_exemptions (
    tax_exemption_id integer NOT NULL,
    customer_id integer,
    organization_name character varying(150) NOT NULL,
    exemption_number character varying(100) NOT NULL,
    jurisdiction_id integer NOT NULL,
    expires_at date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tax_exemptions_tax_exemption_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_exemptions_tax_exemption_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_exemptions_tax_exemption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_exemptions_tax_exemption_id_seq OWNED BY public.tax_exemptions.tax_exemption_id;


--
-- Name: tax_jurisdictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_jurisdictions (
    tax_jurisdiction_id integer NOT NULL,
    name character varying(150) NOT NULL,
    jurisdiction_type character varying(30) NOT NULL,
    parent_jurisdiction_id integer,
    code character varying(20) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true,
    effective_date date DEFAULT CURRENT_DATE,
    end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tax_jurisdictions_jurisdiction_type_check CHECK (((jurisdiction_type)::text = ANY ((ARRAY['country'::character varying, 'state'::character varying, 'county'::character varying, 'city'::character varying, 'special'::character varying])::text[])))
);


--
-- Name: tax_jurisdictions_tax_jurisdiction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_jurisdictions_tax_jurisdiction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_jurisdictions_tax_jurisdiction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_jurisdictions_tax_jurisdiction_id_seq OWNED BY public.tax_jurisdictions.tax_jurisdiction_id;


--
-- Name: tax_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_rates (
    tax_rate_id integer NOT NULL,
    jurisdiction_id integer NOT NULL,
    name character varying(100) NOT NULL,
    rate_percentage numeric(5,4) NOT NULL,
    applies_to character varying(30) DEFAULT 'all'::character varying,
    is_tax_inclusive boolean DEFAULT false,
    is_active boolean DEFAULT true,
    effective_date date DEFAULT CURRENT_DATE,
    end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tax_rates_applies_to_check CHECK (((applies_to)::text = ANY ((ARRAY['all'::character varying, 'food'::character varying, 'alcohol'::character varying, 'merchandise'::character varying, 'delivery'::character varying, 'service'::character varying])::text[])))
);


--
-- Name: tax_rates_tax_rate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_rates_tax_rate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_rates_tax_rate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_rates_tax_rate_id_seq OWNED BY public.tax_rates.tax_rate_id;


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    time_entry_id integer NOT NULL,
    employee_id integer NOT NULL,
    user_id integer,
    clock_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    clock_out timestamp without time zone,
    total_hours numeric(5,2) DEFAULT NULL::numeric,
    status character varying(30) DEFAULT 'active'::character varying,
    notes text,
    location character varying(100) DEFAULT NULL::character varying,
    ip_address character varying(45) DEFAULT NULL::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_entries_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'adjusted'::character varying, 'flagged'::character varying])::text[])))
);


--
-- Name: time_entries_time_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.time_entries_time_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_entries_time_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.time_entries_time_entry_id_seq OWNED BY public.time_entries.time_entry_id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_role_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(30) NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_roles_role_check CHECK (((role)::text = ANY ((ARRAY['manager'::character varying, 'admin'::character varying, 'assistant_manager'::character varying, 'kitchen'::character varying, 'delivery'::character varying, 'waiter'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: user_roles_user_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_roles_user_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_roles_user_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_roles_user_role_id_seq OWNED BY public.user_roles.user_role_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(30) DEFAULT 'waiter'::character varying NOT NULL,
    employee_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: waitlist_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist_entries (
    entry_id integer NOT NULL,
    table_id integer,
    customer_name character varying(100) NOT NULL,
    phone character varying(20) DEFAULT NULL::character varying,
    party_size integer DEFAULT 1 NOT NULL,
    status character varying(30) DEFAULT 'waiting'::character varying,
    pin_code character varying(4) DEFAULT NULL::character varying,
    pin_expires_at timestamp without time zone,
    notified_at timestamp without time zone,
    seated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT waitlist_entries_status_check CHECK (((status)::text = ANY ((ARRAY['waiting'::character varying, 'seated'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::text[])))
);


--
-- Name: waitlist_entries_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.waitlist_entries_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: waitlist_entries_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.waitlist_entries_entry_id_seq OWNED BY public.waitlist_entries.entry_id;


--
-- Name: waste_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waste_logs (
    waste_id integer NOT NULL,
    inventory_id integer NOT NULL,
    quantity integer NOT NULL,
    reason character varying(255) DEFAULT NULL::character varying,
    logged_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: waste_logs_waste_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.waste_logs_waste_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: waste_logs_waste_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.waste_logs_waste_id_seq OWNED BY public.waste_logs.waste_id;


--
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- Name: cart_items cart_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN cart_item_id SET DEFAULT nextval('public.cart_items_cart_item_id_seq'::regclass);


--
-- Name: carts cart_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts ALTER COLUMN cart_id SET DEFAULT nextval('public.carts_cart_id_seq'::regclass);


--
-- Name: combo_meal_sides combo_side_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_meal_sides ALTER COLUMN combo_side_id SET DEFAULT nextval('public.combo_meal_sides_combo_side_id_seq'::regclass);


--
-- Name: combo_meals combo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_meals ALTER COLUMN combo_id SET DEFAULT nextval('public.combo_meals_combo_id_seq'::regclass);


--
-- Name: customer_favorite_combos combo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorite_combos ALTER COLUMN combo_id SET DEFAULT nextval('public.customer_favorite_combos_combo_id_seq'::regclass);


--
-- Name: customer_notification_preferences preference_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notification_preferences ALTER COLUMN preference_id SET DEFAULT nextval('public.customer_notification_preferences_preference_id_seq'::regclass);


--
-- Name: customer_profiles customer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles ALTER COLUMN customer_id SET DEFAULT nextval('public.customer_profiles_customer_id_seq'::regclass);


--
-- Name: dish_of_week_config config_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dish_of_week_config ALTER COLUMN config_id SET DEFAULT nextval('public.dish_of_week_config_config_id_seq'::regclass);


--
-- Name: employees employee_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN employee_id SET DEFAULT nextval('public.employees_employee_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: low_stock_alerts alert_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts ALTER COLUMN alert_id SET DEFAULT nextval('public.low_stock_alerts_alert_id_seq'::regclass);


--
-- Name: menu_item_ingredients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_ingredients ALTER COLUMN id SET DEFAULT nextval('public.menu_item_ingredients_id_seq'::regclass);


--
-- Name: menu_item_modifiers item_modifier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifiers ALTER COLUMN item_modifier_id SET DEFAULT nextval('public.menu_item_modifiers_item_modifier_id_seq'::regclass);


--
-- Name: menu_items item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN item_id SET DEFAULT nextval('public.menu_items_item_id_seq'::regclass);


--
-- Name: menu_modifiers modifier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_modifiers ALTER COLUMN modifier_id SET DEFAULT nextval('public.menu_modifiers_modifier_id_seq'::regclass);


--
-- Name: notification_logs notification_log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs ALTER COLUMN notification_log_id SET DEFAULT nextval('public.notification_logs_notification_log_id_seq'::regclass);


--
-- Name: notification_templates template_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN template_id SET DEFAULT nextval('public.notification_templates_template_id_seq'::regclass);


--
-- Name: order_assignments assignment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_assignments ALTER COLUMN assignment_id SET DEFAULT nextval('public.order_assignments_assignment_id_seq'::regclass);


--
-- Name: order_cook_tracking tracking_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_cook_tracking ALTER COLUMN tracking_id SET DEFAULT nextval('public.order_cook_tracking_tracking_id_seq'::regclass);


--
-- Name: order_discounts discount_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_discounts ALTER COLUMN discount_id SET DEFAULT nextval('public.order_discounts_discount_id_seq'::regclass);


--
-- Name: order_items order_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN order_item_id SET DEFAULT nextval('public.order_items_order_item_id_seq'::regclass);


--
-- Name: order_payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.order_payments_payment_id_seq'::regclass);


--
-- Name: order_tax_details order_tax_detail_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tax_details ALTER COLUMN order_tax_detail_id SET DEFAULT nextval('public.order_tax_details_order_tax_detail_id_seq'::regclass);


--
-- Name: orders master_order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN master_order_id SET DEFAULT nextval('public.orders_master_order_id_seq'::regclass);


--
-- Name: promotions promotion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions ALTER COLUMN promotion_id SET DEFAULT nextval('public.promotions_promotion_id_seq'::regclass);


--
-- Name: purchase_order_items purchase_order_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN purchase_order_item_id SET DEFAULT nextval('public.purchase_order_items_purchase_order_item_id_seq'::regclass);


--
-- Name: purchase_orders purchase_order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN purchase_order_id SET DEFAULT nextval('public.purchase_orders_purchase_order_id_seq'::regclass);


--
-- Name: reorder_rules reorder_rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules ALTER COLUMN reorder_rule_id SET DEFAULT nextval('public.reorder_rules_reorder_rule_id_seq'::regclass);


--
-- Name: reservations reservation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations ALTER COLUMN reservation_id SET DEFAULT nextval('public.reservations_reservation_id_seq'::regclass);


--
-- Name: restaurant_tables table_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_tables ALTER COLUMN table_id SET DEFAULT nextval('public.restaurant_tables_table_id_seq'::regclass);


--
-- Name: sales_audit_config config_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_audit_config ALTER COLUMN config_id SET DEFAULT nextval('public.sales_audit_config_config_id_seq'::regclass);


--
-- Name: sales_audit_results result_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_audit_results ALTER COLUMN result_id SET DEFAULT nextval('public.sales_audit_results_result_id_seq'::regclass);


--
-- Name: schedules schedule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules ALTER COLUMN schedule_id SET DEFAULT nextval('public.schedules_schedule_id_seq'::regclass);


--
-- Name: service_requests request_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests ALTER COLUMN request_id SET DEFAULT nextval('public.service_requests_request_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: stock_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_logs ALTER COLUMN id SET DEFAULT nextval('public.stock_logs_id_seq'::regclass);


--
-- Name: suppliers supplier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('public.suppliers_supplier_id_seq'::regclass);


--
-- Name: surge_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surge_tiers ALTER COLUMN id SET DEFAULT nextval('public.surge_tiers_id_seq'::regclass);


--
-- Name: tax_exemptions tax_exemption_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_exemptions ALTER COLUMN tax_exemption_id SET DEFAULT nextval('public.tax_exemptions_tax_exemption_id_seq'::regclass);


--
-- Name: tax_jurisdictions tax_jurisdiction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_jurisdictions ALTER COLUMN tax_jurisdiction_id SET DEFAULT nextval('public.tax_jurisdictions_tax_jurisdiction_id_seq'::regclass);


--
-- Name: tax_rates tax_rate_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates ALTER COLUMN tax_rate_id SET DEFAULT nextval('public.tax_rates_tax_rate_id_seq'::regclass);


--
-- Name: time_entries time_entry_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries ALTER COLUMN time_entry_id SET DEFAULT nextval('public.time_entries_time_entry_id_seq'::regclass);


--
-- Name: user_roles user_role_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN user_role_id SET DEFAULT nextval('public.user_roles_user_role_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: waitlist_entries entry_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries ALTER COLUMN entry_id SET DEFAULT nextval('public.waitlist_entries_entry_id_seq'::regclass);


--
-- Name: waste_logs waste_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs ALTER COLUMN waste_id SET DEFAULT nextval('public.waste_logs_waste_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (cart_item_id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (cart_id);


--
-- Name: combo_meal_sides combo_meal_sides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_meal_sides
    ADD CONSTRAINT combo_meal_sides_pkey PRIMARY KEY (combo_side_id);


--
-- Name: combo_meals combo_meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_meals
    ADD CONSTRAINT combo_meals_pkey PRIMARY KEY (combo_id);


--
-- Name: customer_favorite_combos customer_favorite_combos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorite_combos
    ADD CONSTRAINT customer_favorite_combos_pkey PRIMARY KEY (combo_id);


--
-- Name: customer_notification_preferences customer_notification_prefere_customer_id_channel_event_typ_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notification_preferences
    ADD CONSTRAINT customer_notification_prefere_customer_id_channel_event_typ_key UNIQUE (customer_id, channel, event_type);


--
-- Name: customer_notification_preferences customer_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notification_preferences
    ADD CONSTRAINT customer_notification_preferences_pkey PRIMARY KEY (preference_id);


--
-- Name: customer_profiles customer_profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_email_key UNIQUE (email);


--
-- Name: customer_profiles customer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (customer_id);


--
-- Name: customer_sessions customer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: customer_sessions customer_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_session_token_key UNIQUE (session_token);


--
-- Name: dish_of_week_config dish_of_week_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dish_of_week_config
    ADD CONSTRAINT dish_of_week_config_pkey PRIMARY KEY (config_id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (employee_id);


--
-- Name: employees employees_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_username_key UNIQUE (username);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_sku_key UNIQUE (sku);


--
-- Name: low_stock_alerts low_stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_pkey PRIMARY KEY (alert_id);


--
-- Name: menu_item_ingredients menu_item_ingredients_menu_item_id_inventory_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_ingredients
    ADD CONSTRAINT menu_item_ingredients_menu_item_id_inventory_id_key UNIQUE (menu_item_id, inventory_id);


--
-- Name: menu_item_ingredients menu_item_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_ingredients
    ADD CONSTRAINT menu_item_ingredients_pkey PRIMARY KEY (id);


--
-- Name: menu_item_modifiers menu_item_modifiers_menu_item_id_modifier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifiers
    ADD CONSTRAINT menu_item_modifiers_menu_item_id_modifier_id_key UNIQUE (menu_item_id, modifier_id);


--
-- Name: menu_item_modifiers menu_item_modifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifiers
    ADD CONSTRAINT menu_item_modifiers_pkey PRIMARY KEY (item_modifier_id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (item_id);


--
-- Name: menu_modifiers menu_modifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_modifiers
    ADD CONSTRAINT menu_modifiers_pkey PRIMARY KEY (modifier_id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (notification_log_id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (template_id);


--
-- Name: order_assignments order_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_assignments
    ADD CONSTRAINT order_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: order_cook_tracking order_cook_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_cook_tracking
    ADD CONSTRAINT order_cook_tracking_pkey PRIMARY KEY (tracking_id);


--
-- Name: order_discounts order_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_pkey PRIMARY KEY (discount_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id);


--
-- Name: order_payments order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_payments
    ADD CONSTRAINT order_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: order_tax_details order_tax_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tax_details
    ADD CONSTRAINT order_tax_details_pkey PRIMARY KEY (order_tax_detail_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (master_order_id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (promotion_id);


--
-- Name: promotions promotions_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_type_key UNIQUE (type);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (purchase_order_item_id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (purchase_order_id);


--
-- Name: reorder_rules reorder_rules_inventory_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_inventory_id_key UNIQUE (inventory_id);


--
-- Name: reorder_rules reorder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_pkey PRIMARY KEY (reorder_rule_id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (reservation_id);


--
-- Name: restaurant_config restaurant_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_config
    ADD CONSTRAINT restaurant_config_pkey PRIMARY KEY (config_key);


--
-- Name: restaurant_tables restaurant_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_pkey PRIMARY KEY (table_id);


--
-- Name: restaurant_tables restaurant_tables_table_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_table_number_key UNIQUE (table_number);


--
-- Name: sales_audit_config sales_audit_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_audit_config
    ADD CONSTRAINT sales_audit_config_pkey PRIMARY KEY (config_id);


--
-- Name: sales_audit_results sales_audit_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_audit_results
    ADD CONSTRAINT sales_audit_results_pkey PRIMARY KEY (result_id);


--
-- Name: schedules schedules_employee_id_schedule_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_employee_id_schedule_date_key UNIQUE (employee_id, schedule_date);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (schedule_id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (request_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: stock_logs stock_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_logs
    ADD CONSTRAINT stock_logs_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: surge_tiers surge_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surge_tiers
    ADD CONSTRAINT surge_tiers_pkey PRIMARY KEY (id);


--
-- Name: table_sessions table_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: tax_exemptions tax_exemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_exemptions
    ADD CONSTRAINT tax_exemptions_pkey PRIMARY KEY (tax_exemption_id);


--
-- Name: tax_jurisdictions tax_jurisdictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_jurisdictions
    ADD CONSTRAINT tax_jurisdictions_pkey PRIMARY KEY (tax_jurisdiction_id);


--
-- Name: tax_rates tax_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT tax_rates_pkey PRIMARY KEY (tax_rate_id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (time_entry_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_role_id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: waitlist_entries waitlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_pkey PRIMARY KEY (entry_id);


--
-- Name: waste_logs waste_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_pkey PRIMARY KEY (waste_id);


--
-- Name: idx_audit_logs_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_modifiers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_modifiers ON public.cart_items USING gin (modifiers);


--
-- Name: idx_carts_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carts_customer_id ON public.carts USING btree (customer_id);


--
-- Name: idx_carts_session_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carts_session_token ON public.carts USING btree (session_token);


--
-- Name: idx_carts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carts_status ON public.carts USING btree (status);


--
-- Name: idx_combo_meal_sides_combo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_meal_sides_combo ON public.combo_meal_sides USING btree (combo_id);


--
-- Name: idx_combo_meals_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_meals_active ON public.combo_meals USING btree (is_active);


--
-- Name: idx_cook_tracking_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cook_tracking_order ON public.order_cook_tracking USING btree (master_order_id);


--
-- Name: idx_cook_tracking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cook_tracking_status ON public.order_cook_tracking USING btree (status);


--
-- Name: idx_customer_favorite_combos_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_favorite_combos_customer_id ON public.customer_favorite_combos USING btree (customer_id);


--
-- Name: idx_customer_notification_preferences_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_notification_preferences_customer_id ON public.customer_notification_preferences USING btree (customer_id);


--
-- Name: idx_customer_notification_preferences_session_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_notification_preferences_session_token ON public.customer_notification_preferences USING btree (session_token);


--
-- Name: idx_customer_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_profiles_email ON public.customer_profiles USING btree (email);


--
-- Name: idx_customer_profiles_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_profiles_phone ON public.customer_profiles USING btree (phone);


--
-- Name: idx_customer_sessions_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_sessions_customer_id ON public.customer_sessions USING btree (customer_id);


--
-- Name: idx_customer_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_sessions_token ON public.customer_sessions USING btree (session_token);


--
-- Name: idx_dish_of_week_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dish_of_week_active ON public.dish_of_week_config USING btree (is_active);


--
-- Name: idx_dish_of_week_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dish_of_week_category ON public.dish_of_week_config USING btree (category_type);


--
-- Name: idx_employees_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_username ON public.employees USING btree (username);


--
-- Name: idx_low_stock_alerts_inventory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_low_stock_alerts_inventory_id ON public.low_stock_alerts USING btree (inventory_id);


--
-- Name: idx_low_stock_alerts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_low_stock_alerts_status ON public.low_stock_alerts USING btree (status);


--
-- Name: idx_menu_item_ingredients_inventory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_ingredients_inventory_id ON public.menu_item_ingredients USING btree (inventory_id);


--
-- Name: idx_menu_item_ingredients_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_ingredients_menu_id ON public.menu_item_ingredients USING btree (menu_item_id);


--
-- Name: idx_menu_item_modifiers_menu_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_modifiers_menu_item_id ON public.menu_item_modifiers USING btree (menu_item_id);


--
-- Name: idx_menu_item_modifiers_modifier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_modifiers_modifier_id ON public.menu_item_modifiers USING btree (modifier_id);


--
-- Name: idx_menu_modifiers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_modifiers_active ON public.menu_modifiers USING btree (is_active);


--
-- Name: idx_notification_logs_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_channel ON public.notification_logs USING btree (channel);


--
-- Name: idx_notification_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_created_at ON public.notification_logs USING btree (created_at);


--
-- Name: idx_notification_logs_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_recipient ON public.notification_logs USING btree (recipient);


--
-- Name: idx_notification_logs_related_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_related_entity ON public.notification_logs USING btree (related_entity_type, related_entity_id);


--
-- Name: idx_notification_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_status ON public.notification_logs USING btree (status);


--
-- Name: idx_notification_templates_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_templates_channel ON public.notification_templates USING btree (channel);


--
-- Name: idx_notification_templates_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_templates_event_type ON public.notification_templates USING btree (event_type);


--
-- Name: idx_order_assignments_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_assignments_assigned_to ON public.order_assignments USING btree (assigned_to);


--
-- Name: idx_order_assignments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_assignments_order_id ON public.order_assignments USING btree (order_id);


--
-- Name: idx_order_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_assignments_status ON public.order_assignments USING btree (status);


--
-- Name: idx_order_discounts_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_discounts_order_id ON public.order_discounts USING btree (master_order_id);


--
-- Name: idx_order_items_modifiers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_modifiers ON public.order_items USING gin (modifiers);


--
-- Name: idx_order_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_payments_order_id ON public.order_payments USING btree (master_order_id);


--
-- Name: idx_order_tax_details_jurisdiction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tax_details_jurisdiction_id ON public.order_tax_details USING btree (jurisdiction_id);


--
-- Name: idx_order_tax_details_master_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tax_details_master_order_id ON public.order_tax_details USING btree (master_order_id);


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_delivery_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_delivery_status ON public.orders USING btree (delivery_status);


--
-- Name: idx_orders_driver_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_driver_location ON public.orders USING btree (driver_latitude, driver_longitude);


--
-- Name: idx_orders_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_idempotency_key ON public.orders USING btree (idempotency_key);


--
-- Name: idx_orders_pickup_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_pickup_code ON public.orders USING btree (pickup_code);


--
-- Name: idx_orders_pickup_scheduled_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_pickup_scheduled_time ON public.orders USING btree (pickup_scheduled_time);


--
-- Name: idx_purchase_order_items_inventory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_inventory_id ON public.purchase_order_items USING btree (inventory_id);


--
-- Name: idx_purchase_order_items_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items USING btree (purchase_order_id);


--
-- Name: idx_purchase_orders_expected_delivery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_expected_delivery ON public.purchase_orders USING btree (expected_delivery_date);


--
-- Name: idx_purchase_orders_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_order_date ON public.purchase_orders USING btree (order_date);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_purchase_orders_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_reorder_rules_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reorder_rules_enabled ON public.reorder_rules USING btree (is_enabled);


--
-- Name: idx_reorder_rules_inventory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reorder_rules_inventory_id ON public.reorder_rules USING btree (inventory_id);


--
-- Name: idx_reservations_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservations_customer_phone ON public.reservations USING btree (customer_phone);


--
-- Name: idx_reservations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservations_date ON public.reservations USING btree (reservation_date);


--
-- Name: idx_reservations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservations_status ON public.reservations USING btree (status);


--
-- Name: idx_reservations_table_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservations_table_id ON public.reservations USING btree (table_id);


--
-- Name: idx_sales_audit_results_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_audit_results_config ON public.sales_audit_results USING btree (config_id);


--
-- Name: idx_sales_audit_results_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_audit_results_period ON public.sales_audit_results USING btree (period_start);


--
-- Name: idx_schedules_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_date ON public.schedules USING btree (schedule_date);


--
-- Name: idx_schedules_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_employee_id ON public.schedules USING btree (employee_id);


--
-- Name: idx_schedules_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_role ON public.schedules USING btree (role);


--
-- Name: idx_service_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_requests_status ON public.service_requests USING btree (status);


--
-- Name: idx_service_requests_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_requests_table ON public.service_requests USING btree (table_number);


--
-- Name: idx_suppliers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_active ON public.suppliers USING btree (is_active);


--
-- Name: idx_tax_exemptions_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_exemptions_customer_id ON public.tax_exemptions USING btree (customer_id);


--
-- Name: idx_tax_exemptions_jurisdiction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_exemptions_jurisdiction_id ON public.tax_exemptions USING btree (jurisdiction_id);


--
-- Name: idx_tax_jurisdictions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_jurisdictions_active ON public.tax_jurisdictions USING btree (is_active, effective_date, end_date);


--
-- Name: idx_tax_jurisdictions_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_jurisdictions_parent ON public.tax_jurisdictions USING btree (parent_jurisdiction_id);


--
-- Name: idx_tax_jurisdictions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_jurisdictions_type ON public.tax_jurisdictions USING btree (jurisdiction_type);


--
-- Name: idx_tax_rates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_rates_active ON public.tax_rates USING btree (is_active, effective_date, end_date);


--
-- Name: idx_tax_rates_jurisdiction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_rates_jurisdiction_id ON public.tax_rates USING btree (jurisdiction_id);


--
-- Name: idx_time_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_date ON public.time_entries USING btree (((clock_in)::date));


--
-- Name: idx_time_entries_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_employee_id ON public.time_entries USING btree (employee_id);


--
-- Name: idx_time_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_status ON public.time_entries USING btree (status);


--
-- Name: idx_time_entries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_user_id ON public.time_entries USING btree (user_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_employee_id ON public.users USING btree (employee_id);


--
-- Name: idx_waitlist_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlist_entries_status ON public.waitlist_entries USING btree (status);


--
-- Name: idx_waitlist_entries_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlist_entries_table ON public.waitlist_entries USING btree (table_id);


--
-- Name: idx_waste_logs_inventory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waste_logs_inventory_id ON public.waste_logs USING btree (inventory_id);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(cart_id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(item_id) ON DELETE CASCADE;


--
-- Name: combo_meal_sides combo_meal_sides_combo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_meal_sides
    ADD CONSTRAINT combo_meal_sides_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combo_meals(combo_id) ON DELETE CASCADE;


--
-- Name: combo_meal_sides combo_meal_sides_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_meal_sides
    ADD CONSTRAINT combo_meal_sides_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(item_id) ON DELETE CASCADE;


--
-- Name: customer_favorite_combos customer_favorite_combos_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorite_combos
    ADD CONSTRAINT customer_favorite_combos_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(customer_id) ON DELETE CASCADE;


--
-- Name: customer_notification_preferences customer_notification_preferences_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notification_preferences
    ADD CONSTRAINT customer_notification_preferences_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(customer_id) ON DELETE CASCADE;


--
-- Name: customer_sessions customer_sessions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(customer_id) ON DELETE CASCADE;


--
-- Name: dish_of_week_config dish_of_week_config_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dish_of_week_config
    ADD CONSTRAINT dish_of_week_config_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(item_id) ON DELETE SET NULL;


--
-- Name: dish_of_week_config dish_of_week_config_set_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dish_of_week_config
    ADD CONSTRAINT dish_of_week_config_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users fk_users_employee_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_employee_id FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE SET NULL;


--
-- Name: low_stock_alerts low_stock_alerts_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;


--
-- Name: menu_item_ingredients menu_item_ingredients_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_ingredients
    ADD CONSTRAINT menu_item_ingredients_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;


--
-- Name: menu_item_ingredients menu_item_ingredients_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_ingredients
    ADD CONSTRAINT menu_item_ingredients_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(item_id) ON DELETE CASCADE;


--
-- Name: menu_item_modifiers menu_item_modifiers_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifiers
    ADD CONSTRAINT menu_item_modifiers_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(item_id) ON DELETE CASCADE;


--
-- Name: menu_item_modifiers menu_item_modifiers_modifier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifiers
    ADD CONSTRAINT menu_item_modifiers_modifier_id_fkey FOREIGN KEY (modifier_id) REFERENCES public.menu_modifiers(modifier_id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(template_id) ON DELETE SET NULL;


--
-- Name: order_assignments order_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_assignments
    ADD CONSTRAINT order_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_assignments order_assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_assignments
    ADD CONSTRAINT order_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_assignments order_assignments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_assignments
    ADD CONSTRAINT order_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(master_order_id) ON DELETE CASCADE;


--
-- Name: order_cook_tracking order_cook_tracking_master_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_cook_tracking
    ADD CONSTRAINT order_cook_tracking_master_order_id_fkey FOREIGN KEY (master_order_id) REFERENCES public.orders(master_order_id) ON DELETE CASCADE;


--
-- Name: order_cook_tracking order_cook_tracking_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_cook_tracking
    ADD CONSTRAINT order_cook_tracking_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id) ON DELETE CASCADE;


--
-- Name: order_discounts order_discounts_master_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_master_order_id_fkey FOREIGN KEY (master_order_id) REFERENCES public.orders(master_order_id) ON DELETE CASCADE;


--
-- Name: order_discounts order_discounts_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(item_id) ON DELETE SET NULL;


--
-- Name: order_discounts order_discounts_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_discounts
    ADD CONSTRAINT order_discounts_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id) ON DELETE SET NULL;


--
-- Name: order_items order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.menu_items(item_id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_master_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_master_order_id_fkey FOREIGN KEY (master_order_id) REFERENCES public.orders(master_order_id) ON DELETE CASCADE;


--
-- Name: order_payments order_payments_master_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_payments
    ADD CONSTRAINT order_payments_master_order_id_fkey FOREIGN KEY (master_order_id) REFERENCES public.orders(master_order_id) ON DELETE CASCADE;


--
-- Name: order_payments order_payments_paid_by_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_payments
    ADD CONSTRAINT order_payments_paid_by_customer_id_fkey FOREIGN KEY (paid_by_customer_id) REFERENCES public.customer_profiles(customer_id) ON DELETE SET NULL;


--
-- Name: order_payments order_payments_paid_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_payments
    ADD CONSTRAINT order_payments_paid_by_user_id_fkey FOREIGN KEY (paid_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_tax_details order_tax_details_jurisdiction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tax_details
    ADD CONSTRAINT order_tax_details_jurisdiction_id_fkey FOREIGN KEY (jurisdiction_id) REFERENCES public.tax_jurisdictions(tax_jurisdiction_id) ON DELETE SET NULL;


--
-- Name: order_tax_details order_tax_details_master_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tax_details
    ADD CONSTRAINT order_tax_details_master_order_id_fkey FOREIGN KEY (master_order_id) REFERENCES public.orders(master_order_id) ON DELETE CASCADE;


--
-- Name: order_tax_details order_tax_details_tax_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tax_details
    ADD CONSTRAINT order_tax_details_tax_rate_id_fkey FOREIGN KEY (tax_rate_id) REFERENCES public.tax_rates(tax_rate_id) ON DELETE SET NULL;


--
-- Name: orders orders_tax_exemption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_tax_exemption_id_fkey FOREIGN KEY (tax_exemption_id) REFERENCES public.tax_exemptions(tax_exemption_id) ON DELETE SET NULL;


--
-- Name: promotions promotions_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(item_id);


--
-- Name: purchase_order_items purchase_order_items_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE RESTRICT;


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(purchase_order_id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_approved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE RESTRICT;


--
-- Name: reorder_rules reorder_rules_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;


--
-- Name: reorder_rules reorder_rules_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE SET NULL;


--
-- Name: reservations reservations_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reservations reservations_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(table_id) ON DELETE SET NULL;


--
-- Name: sales_audit_results sales_audit_results_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_audit_results
    ADD CONSTRAINT sales_audit_results_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.sales_audit_config(config_id) ON DELETE CASCADE;


--
-- Name: sales_audit_results sales_audit_results_top_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_audit_results
    ADD CONSTRAINT sales_audit_results_top_item_id_fkey FOREIGN KEY (top_item_id) REFERENCES public.menu_items(item_id) ON DELETE SET NULL;


--
-- Name: schedules schedules_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: service_requests service_requests_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_requests service_requests_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.table_sessions(session_id) ON DELETE SET NULL;


--
-- Name: sessions sessions_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_waiter_id_fkey FOREIGN KEY (waiter_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_logs stock_logs_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_logs
    ADD CONSTRAINT stock_logs_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;


--
-- Name: table_sessions table_sessions_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(table_id) ON DELETE SET NULL;


--
-- Name: tax_exemptions tax_exemptions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_exemptions
    ADD CONSTRAINT tax_exemptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(customer_id) ON DELETE CASCADE;


--
-- Name: tax_exemptions tax_exemptions_jurisdiction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_exemptions
    ADD CONSTRAINT tax_exemptions_jurisdiction_id_fkey FOREIGN KEY (jurisdiction_id) REFERENCES public.tax_jurisdictions(tax_jurisdiction_id) ON DELETE CASCADE;


--
-- Name: tax_jurisdictions tax_jurisdictions_parent_jurisdiction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_jurisdictions
    ADD CONSTRAINT tax_jurisdictions_parent_jurisdiction_id_fkey FOREIGN KEY (parent_jurisdiction_id) REFERENCES public.tax_jurisdictions(tax_jurisdiction_id) ON DELETE SET NULL;


--
-- Name: tax_rates tax_rates_jurisdiction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT tax_rates_jurisdiction_id_fkey FOREIGN KEY (jurisdiction_id) REFERENCES public.tax_jurisdictions(tax_jurisdiction_id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: waitlist_entries waitlist_entries_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(table_id) ON DELETE SET NULL;


--
-- Name: waste_logs waste_logs_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE CASCADE;


--
-- Name: waste_logs waste_logs_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_logs
    ADD CONSTRAINT waste_logs_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


