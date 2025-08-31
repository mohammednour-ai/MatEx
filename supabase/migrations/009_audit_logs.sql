-- =============================================
-- Migration: 009_audit_logs.sql
-- Description: Create audit log system for tracking all database changes
-- Author: MatEx Development Team
-- Date: 2025-01-31
-- =============================================

-- Create audit_logs table for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core audit fields
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- User and session context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Request context
    request_id TEXT,
    api_endpoint TEXT,
    http_method TEXT,
    
    -- Business context
    business_context JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'info', 'warning', 'high', 'critical')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 years'), -- Legal retention period
    
    -- Search and filtering
    search_vector TSVECTOR
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_expires_at ON public.audit_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tags ON public.audit_logs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_context ON public.audit_logs USING GIN(business_context);
CREATE INDEX IF NOT EXISTS idx_audit_logs_search_vector ON public.audit_logs USING GIN(search_vector);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_date ON public.audit_logs(table_name, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
-- Admins can see all audit logs
CREATE POLICY "audit_logs_admin_all" ON public.audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Users can only see their own audit logs (limited fields)
CREATE POLICY "audit_logs_user_own" ON public.audit_logs
    FOR SELECT USING (
        user_id = auth.uid()
        AND table_name IN ('profiles', 'listings', 'bids', 'orders', 'inspections')
    );

-- System can insert audit logs (for triggers)
CREATE POLICY "audit_logs_system_insert" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_changed_fields TEXT[] DEFAULT NULL,
    p_business_context JSONB DEFAULT '{}',
    p_tags TEXT[] DEFAULT '{}',
    p_severity TEXT DEFAULT 'info'
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_id UUID;
    v_user_email TEXT;
    v_user_role TEXT;
BEGIN
    -- Get current user context
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
        SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    END IF;
    
    -- Insert audit log
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        user_id,
        user_email,
        user_role,
        business_context,
        tags,
        severity,
        search_vector
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        p_old_values,
        p_new_values,
        p_changed_fields,
        v_user_id,
        v_user_email,
        v_user_role,
        p_business_context,
        p_tags,
        p_severity,
        to_tsvector('english', 
            COALESCE(p_table_name, '') || ' ' ||
            COALESCE(p_action, '') || ' ' ||
            COALESCE(v_user_email, '') || ' ' ||
            COALESCE(p_business_context::text, '') || ' ' ||
            COALESCE(array_to_string(p_tags, ' '), '')
        )
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_changed_fields TEXT[];
    v_action TEXT;
    v_record_id UUID;
BEGIN
    -- Determine action and record ID
    IF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old_values := to_jsonb(OLD);
        v_record_id := OLD.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        v_record_id := NEW.id;
        
        -- Calculate changed fields
        SELECT array_agg(key) INTO v_changed_fields
        FROM jsonb_each(v_old_values) old_kv
        JOIN jsonb_each(v_new_values) new_kv ON old_kv.key = new_kv.key
        WHERE old_kv.value IS DISTINCT FROM new_kv.value;
        
    ELSIF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_new_values := to_jsonb(NEW);
        v_record_id := NEW.id;
    END IF;
    
    -- Log the audit event
    PERFORM public.log_audit_event(
        TG_TABLE_NAME,
        v_record_id,
        v_action,
        v_old_values,
        v_new_values,
        v_changed_fields,
        jsonb_build_object('trigger', TG_NAME, 'schema', TG_TABLE_SCHEMA),
        ARRAY['auto', 'trigger'],
        'info'
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for key tables
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_listings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_auctions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.auctions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_bids_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.bids
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_inspections_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.inspections
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_app_settings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Create function to clean up expired audit logs
CREATE OR REPLACE FUNCTION public.cleanup_expired_audit_logs() RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.audit_logs 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    PERFORM public.log_audit_event(
        'audit_logs',
        NULL,
        'CLEANUP',
        NULL,
        jsonb_build_object('deleted_count', v_deleted_count),
        NULL,
        jsonb_build_object('operation', 'cleanup_expired_logs'),
        ARRAY['system', 'cleanup'],
        'info'
    );
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get audit trail for a record
CREATE OR REPLACE FUNCTION public.get_audit_trail(
    p_table_name TEXT,
    p_record_id UUID,
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    id UUID,
    action TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_email TEXT,
    user_role TEXT,
    created_at TIMESTAMPTZ,
    business_context JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.old_values,
        al.new_values,
        al.changed_fields,
        al.user_email,
        al.user_role,
        al.created_at,
        al.business_context
    FROM public.audit_logs al
    WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search audit logs
CREATE OR REPLACE FUNCTION public.search_audit_logs(
    p_search_term TEXT DEFAULT NULL,
    p_table_name TEXT DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_severity TEXT DEFAULT NULL,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    user_email TEXT,
    user_role TEXT,
    severity TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ,
    business_context JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.table_name,
        al.record_id,
        al.action,
        al.user_email,
        al.user_role,
        al.severity,
        al.tags,
        al.created_at,
        al.business_context
    FROM public.audit_logs al
    WHERE 
        (p_search_term IS NULL OR al.search_vector @@ plainto_tsquery('english', p_search_term))
        AND (p_table_name IS NULL OR al.table_name = p_table_name)
        AND (p_action IS NULL OR al.action = p_action)
        AND (p_user_id IS NULL OR al.user_id = p_user_id)
        AND (p_severity IS NULL OR al.severity = p_severity)
        AND (p_from_date IS NULL OR al.created_at >= p_from_date)
        AND (p_to_date IS NULL OR al.created_at <= p_to_date)
        AND (p_tags IS NULL OR al.tags && p_tags)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_trail TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_audit_logs TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit log system for tracking all database changes with full context';
COMMENT ON FUNCTION public.log_audit_event IS 'Function to manually log audit events with business context';
COMMENT ON FUNCTION public.audit_trigger_function IS 'Generic trigger function for automatic audit logging';
COMMENT ON FUNCTION public.get_audit_trail IS 'Get complete audit trail for a specific record';
COMMENT ON FUNCTION public.search_audit_logs IS 'Advanced search function for audit logs with multiple filters';
COMMENT ON FUNCTION public.cleanup_expired_audit_logs IS 'Cleanup function for expired audit logs (run via cron)';
