-- Fix the remaining recursion issue in the profiles UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;

-- Better approach: Don't allow role updates at all via policy
-- Only allow updating name, email, student_id fields
CREATE POLICY "Users can update own profile except role"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Ensure role hasn't changed by using the SECURITY DEFINER helper
  role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- Actually, let's use an even better approach with a trigger to prevent role changes
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from changing their own role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Cannot modify user role';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;

-- Create trigger to enforce role immutability
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- Now simplify the policy since the trigger handles role protection
DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);