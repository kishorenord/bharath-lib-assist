-- Fix infinite recursion in RLS policies by creating SECURITY DEFINER helper functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Librarians can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Librarians can view all books" ON public.books;
DROP POLICY IF EXISTS "Librarians can insert books" ON public.books;
DROP POLICY IF EXISTS "Librarians can update books" ON public.books;
DROP POLICY IF EXISTS "Librarians can delete books" ON public.books;
DROP POLICY IF EXISTS "Users can view available books" ON public.books;
DROP POLICY IF EXISTS "Users can view their own borrowed books" ON public.borrowed_books;
DROP POLICY IF EXISTS "Librarians can view all borrowed books" ON public.borrowed_books;
DROP POLICY IF EXISTS "Users can borrow books" ON public.borrowed_books;
DROP POLICY IF EXISTS "Librarians can manage borrowed books" ON public.borrowed_books;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Librarians can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;

-- Create SECURITY DEFINER function to check if user is a librarian
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_librarian(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'librarian'
  );
$$;

-- Create SECURITY DEFINER function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Recreate profiles policies using the helper function
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Librarians can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_librarian(auth.uid()));

-- SECURITY FIX: Prevent users from changing their own role
-- Only allow updating fields other than 'role'
CREATE POLICY "Users can update own profile except role"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Recreate books policies using the helper function
CREATE POLICY "Users can view available books"
ON public.books FOR SELECT
USING (true);

CREATE POLICY "Librarians can view all books"
ON public.books FOR SELECT
USING (public.is_librarian(auth.uid()));

CREATE POLICY "Librarians can insert books"
ON public.books FOR INSERT
WITH CHECK (public.is_librarian(auth.uid()));

CREATE POLICY "Librarians can update books"
ON public.books FOR UPDATE
USING (public.is_librarian(auth.uid()));

CREATE POLICY "Librarians can delete books"
ON public.books FOR DELETE
USING (public.is_librarian(auth.uid()));

-- Recreate borrowed_books policies
CREATE POLICY "Users can view their own borrowed books"
ON public.borrowed_books FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Librarians can view all borrowed books"
ON public.borrowed_books FOR SELECT
USING (public.is_librarian(auth.uid()));

CREATE POLICY "Users can borrow books"
ON public.borrowed_books FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Librarians can manage borrowed books"
ON public.borrowed_books FOR UPDATE
USING (public.is_librarian(auth.uid()));

CREATE POLICY "Librarians can delete borrowed books"
ON public.borrowed_books FOR DELETE
USING (public.is_librarian(auth.uid()));

-- Recreate chat_messages policies
CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Librarians can view all messages"
ON public.chat_messages FOR SELECT
USING (public.is_librarian(auth.uid()));

CREATE POLICY "Users can insert their own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);