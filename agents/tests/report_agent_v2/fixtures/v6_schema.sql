-- Minimal replica of the v6api_postgre tenant schema used by the integration tests.
-- Shapes copied from: UsersDbContext, WorkflowDbContext, wForm/wFormControl, ezfb_*_items,
-- WorkflowTableCreator (process_form_/workflow_instances_), inbox_ tables.

CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS dbo;
CREATE SCHEMA IF NOT EXISTS repository;

CREATE TABLE users."Users" (
    "Id" uuid PRIMARY KEY, "TenantId" uuid NOT NULL, "Email" varchar(256) NOT NULL,
    "DisplayName" varchar(256) NOT NULL, "Role" varchar(64) NOT NULL, "IsDeleted" boolean NOT NULL DEFAULT false
);
CREATE TABLE users."UserGroups" ("UserId" uuid NOT NULL, "GroupId" uuid NOT NULL);

CREATE TABLE workflow."Workflows" (
    "Id" uuid PRIMARY KEY, "TenantId" uuid NOT NULL, "Name" varchar(256) NOT NULL, "Description" varchar(2000),
    "FormId" varchar(64), "IsDeleted" boolean NOT NULL DEFAULT false
);

CREATE TABLE dbo."wForm" (id varchar(64) PRIMARY KEY, name varchar(256), type varchar(64), "isDeleted" boolean NOT NULL DEFAULT false);
CREATE TABLE dbo."wFormControl" (
    id serial PRIMARY KEY, "wFormId" varchar(64) NOT NULL, "parentId" integer NOT NULL DEFAULT 0,
    "jsonId" varchar(64), name varchar(256), type varchar(64), "isMandatory" boolean NOT NULL DEFAULT false,
    "isDeleted" boolean NOT NULL DEFAULT false, "columnName" varchar(200)
);

-- New-era form: columns named from labels; values stored as text, exactly like production.
CREATE TABLE dbo."ezfb_8aaadcde_items" (
    item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Invoice_No" text, "Supplier" text, "Invoice_Amount" text, "Paid_Amount" text,
    "Due_Date" text, "Invoice_Date" text,
    created_at timestamptz NOT NULL DEFAULT now(), is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE workflow.process_form_b05ed64d (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, workflow_instance_id uuid NOT NULL,
    w_form_id varchar(64) NOT NULL, form_entry_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NOT NULL, is_deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE workflow.workflow_instances_b05ed64d (
    id uuid PRIMARY KEY, tenant_id uuid NOT NULL, workflow_id uuid NOT NULL, workflow_name varchar(256) NOT NULL,
    status integer NOT NULL, created_at_utc timestamptz NOT NULL DEFAULT now(), completed_at_utc timestamptz NULL,
    reference_number varchar(128) NULL
);
CREATE TABLE workflow.inbox_b05ed64d (
    id serial PRIMARY KEY, form_entry_id text, workflow_instance_id text, stage text, name text,
    created_by_name text, created_at_utc timestamptz NOT NULL DEFAULT now()
);
