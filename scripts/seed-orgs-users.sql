-- seed-orgs-users.sql
-- Seed reference data: organizations and users
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
-- Users table now contains role and org_id directly.
-- Roles: admin, manager, member (org-scoped) | support, super_admin (global)
-- org_id is NULL for global roles (support, super_admin)

-- Small Startup users
INSERT INTO users (user_id, email, display_name, org_id, role, created_at) VALUES
  ('user_small_1', 'alice@smallstartup.com', 'Alice Chen', 'org_small', 'admin', now() - interval '150 days'),
  ('user_small_2', 'bob@smallstartup.com', 'Bob Smith', 'org_small', 'member', now() - interval '120 days')
ON CONFLICT (user_id) DO NOTHING;

-- Medium Team users
INSERT INTO users (user_id, email, display_name, org_id, role, created_at) VALUES
  ('user_med_1', 'charlie@mediumteam.com', 'Charlie Brown', 'org_medium', 'admin', now() - interval '300 days'),
  ('user_med_2', 'diana@mediumteam.com', 'Diana Ross', 'org_medium', 'manager', now() - interval '280 days'),
  ('user_med_3', 'evan@mediumteam.com', 'Evan Wright', 'org_medium', 'member', now() - interval '250 days'),
  ('user_med_4', 'fiona@mediumteam.com', 'Fiona Green', 'org_medium', 'member', now() - interval '200 days'),
  ('user_med_5', 'george@mediumteam.com', 'George Liu', 'org_medium', 'member', now() - interval '180 days')
ON CONFLICT (user_id) DO NOTHING;

-- Large Corp users
INSERT INTO users (user_id, email, display_name, org_id, role, created_at) VALUES
  ('user_large_1', 'henry@largecorp.com', 'Henry Adams', 'org_large', 'admin', now() - interval '700 days'),
  ('user_large_2', 'iris@largecorp.com', 'Iris Baker', 'org_large', 'manager', now() - interval '650 days'),
  ('user_large_3', 'jack@largecorp.com', 'Jack Cooper', 'org_large', 'member', now() - interval '600 days'),
  ('user_large_4', 'kate@largecorp.com', 'Kate Davis', 'org_large', 'member', now() - interval '550 days'),
  ('user_large_5', 'leo@largecorp.com', 'Leo Evans', 'org_large', 'member', now() - interval '500 days'),
  ('user_large_6', 'maya@largecorp.com', 'Maya Foster', 'org_large', 'member', now() - interval '450 days'),
  ('user_large_7', 'noah@largecorp.com', 'Noah Garcia', 'org_large', 'member', now() - interval '400 days'),
  ('user_large_8', 'olivia@largecorp.com', 'Olivia Hill', 'org_large', 'member', now() - interval '350 days'),
  ('user_large_9', 'peter@largecorp.com', 'Peter Irving', 'org_large', 'member', now() - interval '300 days'),
  ('user_large_10', 'quinn@largecorp.com', 'Quinn Jones', 'org_large', 'member', now() - interval '250 days')
ON CONFLICT (user_id) DO NOTHING;

-- Platform users (global roles - no org membership)
INSERT INTO users (user_id, email, display_name, org_id, role, created_at) VALUES
  ('user_support_1', 'eve.support@platform.com', 'Eve Support', NULL, 'support', now() - interval '365 days'),
  ('user_admin_1', 'frank.admin@platform.com', 'Frank Super', NULL, 'super_admin', now() - interval '730 days')
ON CONFLICT (user_id) DO NOTHING;
