-- Eventra Multi-Tenant SaaS Architecture Migration
-- Idempotent & non-destructive: carefully attaches organizations and subscriptions
-- while preserving all existing Eventra festival, user, and results data.

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  logo_url text,
  website text,
  billing_email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);

-- 2. Organization Memberships (RBAC)
-- Roles: owner, admin, coordinator, judge, team-mgr, member
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- 3. Organization Invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'coordinator',
  token text NOT NULL UNIQUE,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(organization_id, lower(email));

-- 4. Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_per_event numeric(10,2) NOT NULL DEFAULT 0,
  max_events integer NOT NULL DEFAULT 1,
  max_participants integer NOT NULL DEFAULT 100,
  max_programmes integer NOT NULL DEFAULT 10,
  max_judges integer NOT NULL DEFAULT 5,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed standard subscription plans
INSERT INTO subscription_plans(code, name, description, price_monthly, price_per_event, max_events, max_participants, max_programmes, max_judges, features)
VALUES
  ('trial', '14-Day Free Trial', 'Explore Eventra with essential festival features', 0, 0, 1, 100, 10, 5, '{"custom_domain": false, "certificates": true, "qr_verification": true}'::jsonb),
  ('campus', 'Campus Festival', 'Perfect for collegiate arts, music, and annual sports days', 49.00, 49.00, 2, 500, 30, 15, '{"custom_domain": false, "certificates": true, "qr_verification": true, "leaderboard": true}'::jsonb),
  ('pro', 'Pro Tournament & Gala', 'For multi-college championships and high-capacity festivals', 149.00, 149.00, 5, 2500, 100, 50, '{"custom_domain": true, "certificates": true, "qr_verification": true, "leaderboard": true, "priority_support": true}'::jsonb),
  ('enterprise', 'National Federation', 'Unlimited workspaces, custom branding, and SLA', 399.00, 399.00, 999, 50000, 999, 999, '{"custom_domain": true, "certificates": true, "qr_verification": true, "leaderboard": true, "priority_support": true, "dedicated_instance": true}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  max_events = EXCLUDED.max_events,
  max_participants = EXCLUDED.max_participants,
  max_programmes = EXCLUDED.max_programmes,
  max_judges = EXCLUDED.max_judges,
  features = EXCLUDED.features;

-- 5. Organization Subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES subscription_plans(code),
  status text NOT NULL DEFAULT 'trialing', -- trialing, active, past_due, canceled, expired
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz NOT NULL DEFAULT now(),
  current_period_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  payment_provider text NOT NULL DEFAULT 'pending_gateway', -- pending_gateway, stripe, razorpay
  payment_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_sub_status ON organization_subscriptions(status);

-- 6. User Email Verification & Password Reset
CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_token ON user_verifications(token);

CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- 7. Add organization_id to events for multi-tenancy
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_organization ON events(organization_id);

-- 8. Backfill initial platform organization for existing events
DO $$
DECLARE
  default_org_id uuid;
  faris_user_id uuid;
BEGIN
  -- Find Faris or first admin user
  SELECT id INTO faris_user_id FROM users WHERE email='owner@eventra.local' LIMIT 1;
  IF faris_user_id IS NULL THEN
    SELECT id INTO faris_user_id FROM users ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Create Default Eventra Platform Organization
  INSERT INTO organizations (name, slug, owner_user_id, status)
  VALUES ('Eventra Headquarters', 'eventra-hq', faris_user_id, 'active')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO default_org_id;

  -- Create default subscription
  INSERT INTO organization_subscriptions (organization_id, plan_code, status, current_period_ends_at)
  VALUES (default_org_id, 'enterprise', 'active', now() + interval '10 years')
  ON CONFLICT (organization_id) DO NOTHING;

  -- Assign admin to organization
  IF faris_user_id IS NOT NULL THEN
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES (default_org_id, faris_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  -- Link existing unassigned events to the default organization
  UPDATE events SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;
