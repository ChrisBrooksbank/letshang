-- Migration: Add Google OAuth Profile Import
-- Updates the handle_new_user trigger to import profile photo from Google OAuth
-- Migration: 20260123_add_google_oauth_profile_import

-- Update function to import profile photo from OAuth metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, display_name, profile_photo_url, created_at, updated_at)
    VALUES (
        NEW.id,
        -- Use OAuth display name if available, otherwise email local part
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1)
        ),
        -- Import profile photo from OAuth provider if available
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            NULL
        ),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the OAuth integration
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile on signup, importing display name and photo from OAuth providers (Google, Apple, Facebook)';
