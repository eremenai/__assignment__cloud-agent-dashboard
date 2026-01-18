-- seed-orgs-users.sql
-- Seed reference data: organizations, users, and memberships
-- This file is run automatically on first container start

-- ============================================================================
-- Organizations
-- ============================================================================

INSERT INTO orgs (org_id, name, created_at) VALUES
  ('org_small', 'Small Startup', now() - interval '180 days'),
  ('org_medium', 'Medium Team', now() - interval '365 days'),
  ('org_large', 'Large Corp', now() - interval '730 days')
ON CONFLICT (org_id) DO NOTHING;

-- ============================================================================
-- Users
-- ============================================================================

-- Small Startup users
INSERT INTO users (user_id, email, display_name, created_at) VALUES
  ('user_small_1', 'alice@smallstartup.com', 'Alice Chen', now() - interval '150 days'),
  ('user_small_2', 'bob@smallstartup.com', 'Bob Smith', now() - interval '120 days')
ON CONFLICT (user_id) DO NOTHING;

-- Medium Team users
INSERT INTO users (user_id, email, display_name, created_at) VALUES
  ('user_med_1', 'charlie@mediumteam.com', 'Charlie Brown', now() - interval '300 days'),
  ('user_med_2', 'diana@mediumteam.com', 'Diana Ross', now() - interval '280 days'),
  ('user_med_3', 'evan@mediumteam.com', 'Evan Wright', now() - interval '250 days'),
  ('user_med_4', 'fiona@mediumteam.com', 'Fiona Green', now() - interval '200 days'),
  ('user_med_5', 'george@mediumteam.com', 'George Liu', now() - interval '180 days')
ON CONFLICT (user_id) DO NOTHING;

-- Large Corp users
INSERT INTO users (user_id, email, display_name, created_at) VALUES
  ('user_large_1', 'henry@largecorp.com', 'Henry Adams', now() - interval '700 days'),
  ('user_large_2', 'iris@largecorp.com', 'Iris Baker', now() - interval '650 days'),
  ('user_large_3', 'jack@largecorp.com', 'Jack Cooper', now() - interval '600 days'),
  ('user_large_4', 'kate@largecorp.com', 'Kate Davis', now() - interval '550 days'),
  ('user_large_5', 'leo@largecorp.com', 'Leo Evans', now() - interval '500 days'),
  ('user_large_6', 'maya@largecorp.com', 'Maya Foster', now() - interval '450 days'),
  ('user_large_7', 'noah@largecorp.com', 'Noah Garcia', now() - interval '400 days'),
  ('user_large_8', 'olivia@largecorp.com', 'Olivia Hill', now() - interval '350 days'),
  ('user_large_9', 'peter@largecorp.com', 'Peter Irving', now() - interval '300 days'),
  ('user_large_10', 'quinn@largecorp.com', 'Quinn Jones', now() - interval '250 days')
ON CONFLICT (user_id) DO NOTHING;

-- Platform users (SUPPORT, SUPER_ADMIN)
INSERT INTO users (user_id, email, display_name, created_at) VALUES
  ('user_support_1', 'support@platform.com', 'Support Agent', now() - interval '365 days'),
  ('user_admin_1', 'admin@platform.com', 'Platform Admin', now() - interval '730 days')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Organization Memberships
-- ============================================================================

-- Small Startup memberships
INSERT INTO org_members (org_id, user_id, role, created_at) VALUES
  ('org_small', 'user_small_1', 'admin', now() - interval '150 days'),
  ('org_small', 'user_small_2', 'member', now() - interval '120 days')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Medium Team memberships
INSERT INTO org_members (org_id, user_id, role, created_at) VALUES
  ('org_medium', 'user_med_1', 'admin', now() - interval '300 days'),
  ('org_medium', 'user_med_2', 'member', now() - interval '280 days'),
  ('org_medium', 'user_med_3', 'member', now() - interval '250 days'),
  ('org_medium', 'user_med_4', 'member', now() - interval '200 days'),
  ('org_medium', 'user_med_5', 'viewer', now() - interval '180 days')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Large Corp memberships
INSERT INTO org_members (org_id, user_id, role, created_at) VALUES
  ('org_large', 'user_large_1', 'admin', now() - interval '700 days'),
  ('org_large', 'user_large_2', 'admin', now() - interval '650 days'),
  ('org_large', 'user_large_3', 'member', now() - interval '600 days'),
  ('org_large', 'user_large_4', 'member', now() - interval '550 days'),
  ('org_large', 'user_large_5', 'member', now() - interval '500 days'),
  ('org_large', 'user_large_6', 'member', now() - interval '450 days'),
  ('org_large', 'user_large_7', 'member', now() - interval '400 days'),
  ('org_large', 'user_large_8', 'member', now() - interval '350 days'),
  ('org_large', 'user_large_9', 'viewer', now() - interval '300 days'),
  ('org_large', 'user_large_10', 'viewer', now() - interval '250 days')
ON CONFLICT (org_id, user_id) DO NOTHING;
