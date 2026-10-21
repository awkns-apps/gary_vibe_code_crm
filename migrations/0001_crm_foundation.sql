BEGIN;

CREATE TYPE crm_client_status AS ENUM ('lead', 'qualified', 'active', 'dormant', 'archived');
CREATE TYPE crm_deal_stage AS ENUM ('discovery', 'analysis', 'proposal', 'negotiation', 'won', 'lost');
CREATE TYPE crm_analysis_type AS ENUM ('needs', 'market', 'pricing');
CREATE TYPE crm_run_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE crm_analysis_status AS ENUM ('draft', 'needs_review', 'approved', 'superseded', 'rejected');
CREATE TYPE crm_proposal_status AS ENUM ('pending', 'approved', 'rejected', 'applied', 'conflict');

CREATE TABLE crm_clients (
  id serial PRIMARY KEY,
  name text NOT NULL,
  legal_name text,
  client_type varchar(24) NOT NULL DEFAULT 'company',
  industry text,
  website text,
  source text,
  status crm_client_status NOT NULL DEFAULT 'lead',
  owner text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  notes text,
  last_interaction_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE crm_contacts (
  id serial PRIMARY KEY,
  client_id integer NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  department text,
  email text,
  phone text,
  linkedin_url text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_deals (
  id serial PRIMARY KEY,
  client_id integer NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  stage crm_deal_stage NOT NULL DEFAULT 'discovery',
  value numeric(14, 2),
  currency varchar(3) NOT NULL DEFAULT 'TWD',
  probability integer NOT NULL DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  expected_close_at timestamptz,
  scope text,
  pricing_notes text,
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_activities (
  id serial PRIMARY KEY,
  client_id integer NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  deal_id integer REFERENCES crm_deals(id) ON DELETE SET NULL,
  type varchar(24) NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  content text,
  source varchar(24) NOT NULL DEFAULT 'human',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_analyses (
  id serial PRIMARY KEY,
  client_id integer NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  deal_id integer REFERENCES crm_deals(id) ON DELETE SET NULL,
  type crm_analysis_type NOT NULL,
  title text NOT NULL,
  status crm_analysis_status NOT NULL DEFAULT 'draft',
  summary text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence integer CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  supersedes_id integer REFERENCES crm_analyses(id) ON DELETE SET NULL,
  created_by varchar(64) NOT NULL DEFAULT 'human',
  reviewed_by varchar(96),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_agent_runs (
  id serial PRIMARY KEY,
  client_id integer REFERENCES crm_clients(id) ON DELETE SET NULL,
  analysis_id integer REFERENCES crm_analyses(id) ON DELETE SET NULL,
  agent_name varchar(96) NOT NULL,
  task_type varchar(48) NOT NULL,
  status crm_run_status NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  model varchar(96),
  prompt_version varchar(48),
  idempotency_key varchar(128) NOT NULL,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_change_proposals (
  id serial PRIMARY KEY,
  agent_run_id integer NOT NULL REFERENCES crm_agent_runs(id) ON DELETE CASCADE,
  entity_type varchar(48) NOT NULL,
  entity_id integer,
  operation varchar(16) NOT NULL CHECK (operation IN ('create', 'update', 'archive')),
  proposed_data jsonb NOT NULL,
  current_snapshot jsonb,
  reason text NOT NULL,
  confidence integer CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  status crm_proposal_status NOT NULL DEFAULT 'pending',
  reviewed_by varchar(96),
  reviewed_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_clients_status_idx ON crm_clients(status);
CREATE INDEX crm_clients_next_action_at_idx ON crm_clients(next_action_at);
CREATE INDEX crm_clients_updated_at_idx ON crm_clients(updated_at);
CREATE INDEX crm_contacts_client_id_idx ON crm_contacts(client_id);
CREATE INDEX crm_contacts_email_idx ON crm_contacts(email);
CREATE INDEX crm_deals_client_id_idx ON crm_deals(client_id);
CREATE INDEX crm_deals_stage_idx ON crm_deals(stage);
CREATE INDEX crm_deals_expected_close_at_idx ON crm_deals(expected_close_at);
CREATE INDEX crm_activities_client_id_idx ON crm_activities(client_id);
CREATE INDEX crm_activities_due_at_idx ON crm_activities(due_at);
CREATE INDEX crm_activities_occurred_at_idx ON crm_activities(occurred_at);
CREATE INDEX crm_analyses_client_id_idx ON crm_analyses(client_id);
CREATE INDEX crm_analyses_deal_id_idx ON crm_analyses(deal_id);
CREATE INDEX crm_analyses_type_status_idx ON crm_analyses(type, status);
CREATE INDEX crm_analyses_updated_at_idx ON crm_analyses(updated_at);
CREATE UNIQUE INDEX crm_agent_runs_idempotency_key_idx ON crm_agent_runs(idempotency_key);
CREATE INDEX crm_agent_runs_client_id_idx ON crm_agent_runs(client_id);
CREATE INDEX crm_agent_runs_status_idx ON crm_agent_runs(status);
CREATE INDEX crm_agent_runs_created_at_idx ON crm_agent_runs(created_at);
CREATE INDEX crm_change_proposals_agent_run_id_idx ON crm_change_proposals(agent_run_id);
CREATE INDEX crm_change_proposals_status_idx ON crm_change_proposals(status);
CREATE INDEX crm_change_proposals_entity_idx ON crm_change_proposals(entity_type, entity_id);

COMMIT;
