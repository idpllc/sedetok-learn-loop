-- Add new role values to app_role enum
-- We need to check if they exist first because ADD VALUE doesn't support IF NOT EXISTS

DO $$ 
BEGIN
    -- Add 'institution' role
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'institution' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'institution';
    END IF;
    
    -- Add 'teacher' role
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'teacher' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'teacher';
    END IF;
    
    -- Add 'parent' role
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'parent' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'parent';
    END IF;
END $$;