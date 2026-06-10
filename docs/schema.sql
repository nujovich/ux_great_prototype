-- =============================================================================
-- WP5 Resource Estimation — Greenfield Schema v2
-- PostgreSQL 15+
-- Generated from 12-question grilling session — all decisions resolved
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- ESTIMATION CYCLE
-- =============================================================================

CREATE TABLE estimation_cycle (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    start_date     DATE        NOT NULL,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_by_oid TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active cycle at a time
CREATE UNIQUE INDEX uq_estimation_cycle_active
    ON estimation_cycle (is_active)
    WHERE is_active = true;


-- =============================================================================
-- PROJECT LINES  (received from HVT Stage 1 — upsert on pl_number + metier)
-- =============================================================================

CREATE TABLE project_line (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id           UUID        NOT NULL REFERENCES estimation_cycle(id) ON DELETE RESTRICT,
    pl_number          TEXT        NOT NULL,
    pl_name            TEXT        NOT NULL,
    metier             TEXT        NOT NULL CHECK (metier IN (
                           'H-DESIGN', 'H-TUNING', 'H-SOFTWARE',
                           'H-CUSTOMER', 'H-PROJECT', 'H-NP')),
    status             TEXT        NOT NULL DEFAULT 'To do' CHECK (status IN (
                           'To do', 'Draft', 'Estimated', 'Sent', 'Rejected', 'Approved')),
    assignee_oid       TEXT        NULL,
    -- HVT attributes (used for workload standard filtering and allocation routing)
    organ_type         TEXT        NULL,
    energy             TEXT        NULL,
    project_ranking    TEXT        NULL,
    injection_system   TEXT        NULL,
    alliance_code      TEXT        NULL,
    vehicle_code       TEXT        NULL,
    market             TEXT        NULL,
    standard_emissions TEXT        NULL,
    client             TEXT        NULL,
    request_type       TEXT        NULL,
    engineering        TEXT        NULL,
    estimate_type      TEXT        NULL,
    -- Milestone dates (SP mandatory for save; others drive distribution)
    sp_date            DATE        NULL,
    pc_date            DATE        NULL,
    co_date            DATE        NULL,
    sop_date           DATE        NULL,
    -- Parent-child relationship (from HVT payload — WP5 stores, does not manage)
    parent_pl_number   TEXT        NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_project_line_pl_metier
    ON project_line (cycle_id, pl_number, metier);

CREATE INDEX idx_project_line_cycle_status
    ON project_line (cycle_id, status);

CREATE INDEX idx_project_line_assignee
    ON project_line (assignee_oid)
    WHERE assignee_oid IS NOT NULL;

-- Compatibility filter index (multi-select and copy estimation use these 4 fields)
CREATE INDEX idx_project_line_compat
    ON project_line (cycle_id, organ_type, energy, project_ranking, injection_system);


-- =============================================================================
-- STATUS CHANGE LOG  (event log for Management View timeline + audit trail)
-- =============================================================================

CREATE TABLE status_change_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_line_id UUID        NOT NULL REFERENCES project_line(id) ON DELETE RESTRICT,
    cycle_id        UUID        NOT NULL REFERENCES estimation_cycle(id) ON DELETE RESTRICT,
    from_status     TEXT        NULL,  -- NULL on initial 'To do' creation
    to_status       TEXT        NOT NULL,
    -- CPO rejection comment stored here on Sent → Rejected transition
    comment         TEXT        NULL,
    changed_by_oid  TEXT        NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_change_log_pl
    ON status_change_log (project_line_id, changed_at);

-- Timeline chart query: count pairs per status per day for a cycle
CREATE INDEX idx_status_change_log_cycle_time
    ON status_change_log (cycle_id, changed_at);


-- =============================================================================
-- WORKLOAD STANDARD  (replaces workload_standard_database.pkl)
-- =============================================================================

CREATE TABLE workload_standard_version (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    metier          TEXT        NOT NULL CHECK (metier IN (
                        'H-DESIGN', 'H-TUNING', 'H-SOFTWARE', 'H-CUSTOMER')),
    version_number  TEXT        NOT NULL,
    uploaded_by_oid TEXT        NOT NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    notes           TEXT        NULL
);

-- One active version per métier at a time
CREATE UNIQUE INDEX uq_ws_version_active
    ON workload_standard_version (metier)
    WHERE is_active = true;


-- N2 — Inductor definitions with project-line filter attributes (Induct_CoefN2 sheet)
CREATE TABLE ws_n2_entry (
    id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id       UUID  NOT NULL REFERENCES workload_standard_version(id) ON DELETE RESTRICT,
    inductor_name    TEXT  NOT NULL,
    cran_name        TEXT  NOT NULL,
    -- Filter attributes (used by filter_induct_n2 to match project line)
    organ_type       TEXT  NULL,
    fuel_type        TEXT  NULL,
    ranking          TEXT  NULL,
    injection_system TEXT  NULL,
    group_name       TEXT  NULL,  -- defines collapsible groups in Manage Inducers panel
    comment          TEXT  NULL
);

CREATE INDEX idx_ws_n2_version
    ON ws_n2_entry (version_id);

-- The 4-attribute filter that determines which inductors apply to a project line
CREATE INDEX idx_ws_n2_filter
    ON ws_n2_entry (version_id, organ_type, fuel_type, ranking, injection_system);


-- N3 — Job unit definitions (Induct_CoefN3 sheet)
-- n2_entry_id replaces the mat_N2_N3 mapping sheet — set during seeding
CREATE TABLE ws_n3_entry (
    id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    n2_entry_id     UUID     NOT NULL REFERENCES ws_n2_entry(id) ON DELETE RESTRICT,
    ju_short_name   TEXT     NOT NULL,
    ju_long_name    TEXT     NOT NULL,
    variable        NUMERIC  NOT NULL DEFAULT 0,
    fixed           NUMERIC  NOT NULL DEFAULT 0,
    unit_type       TEXT     NOT NULL CHECK (unit_type IN (
                        'Man Day', 'Bench Hours', 'Kilometres', 'Kiloeuros')),
    fmm             TEXT     NULL,
    fmm_desc        TEXT     NULL,
    smm             TEXT     NULL,
    dmm             TEXT     NULL,
    generic_profile TEXT     NULL,
    comment         TEXT     NULL
);

CREATE INDEX idx_ws_n3_n2_entry
    ON ws_n3_entry (n2_entry_id);


-- =============================================================================
-- INDUCTORS  (engineer-configured instances per project line)
-- =============================================================================

CREATE TABLE inductor (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_line_id UUID        NOT NULL REFERENCES project_line(id) ON DELETE RESTRICT,
    -- NULL for custom inductors; set for standard library inductors
    ws_n2_entry_id  UUID        NULL REFERENCES ws_n2_entry(id) ON DELETE RESTRICT,
    name            TEXT        NOT NULL,
    cran            TEXT        NULL,
    group_name      TEXT        NULL,
    -- Inductor-level occurrence; propagates to unlocked JUs
    occurrence      NUMERIC     NULL,
    is_custom       BOOLEAN     NOT NULL DEFAULT false,
    active          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inductor_project_line
    ON inductor (project_line_id);


-- =============================================================================
-- JOB UNITS  (engineer-configured instances; coefficients stored at save time)
-- =============================================================================

CREATE TABLE job_unit (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    inductor_id       UUID        NOT NULL REFERENCES inductor(id) ON DELETE RESTRICT,
    project_line_id   UUID        NOT NULL REFERENCES project_line(id) ON DELETE RESTRICT,
    -- NULL for custom JUs; set for standard library JUs
    -- Coefficients below are copied from ws_n3_entry at save time and never change
    ws_n3_entry_id    UUID        NULL REFERENCES ws_n3_entry(id) ON DELETE RESTRICT,
    ju_short_name     TEXT        NOT NULL,
    ju_long_name      TEXT        NOT NULL,
    -- Coefficients stored at save time — immutable after save
    variable          NUMERIC     NOT NULL DEFAULT 0,
    fixed             NUMERIC     NOT NULL DEFAULT 0,
    unit_type         TEXT        NOT NULL CHECK (unit_type IN (
                          'Man Day', 'Bench Hours', 'Kilometres', 'Kiloeuros')),
    fmm               TEXT        NULL,
    fmm_desc          TEXT        NULL,
    smm               TEXT        NULL,
    dmm               TEXT        NULL,
    -- Engineer-set values
    occurrence        NUMERIC     NOT NULL DEFAULT 1,
    occurrence_locked BOOLEAN     NOT NULL DEFAULT false,
    -- Computed on Save as Draft
    total_fte         NUMERIC     NOT NULL DEFAULT 0,
    total_bh          NUMERIC     NOT NULL DEFAULT 0,
    total_km          NUMERIC     NOT NULL DEFAULT 0,
    is_custom         BOOLEAN     NOT NULL DEFAULT false,
    -- Routing métier: BH/KM → H-TESTING; else must match project_line.metier (enforced by trigger)
    metier            TEXT        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_unit_project_line
    ON job_unit (project_line_id);

CREATE INDEX idx_job_unit_inductor
    ON job_unit (inductor_id);


-- Yearly breakdown per job unit (fte/bh/km from Estimation; keuro from Allocation)
CREATE TABLE job_unit_yearly_value (
    id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    job_unit_id UUID     NOT NULL REFERENCES job_unit(id) ON DELETE RESTRICT,
    year        INT      NOT NULL,
    fte         NUMERIC  NOT NULL DEFAULT 0,
    bh          NUMERIC  NOT NULL DEFAULT 0,
    km          NUMERIC  NOT NULL DEFAULT 0,
    keuro       NUMERIC  NOT NULL DEFAULT 0,
    UNIQUE (job_unit_id, year)
);

CREATE INDEX idx_juyv_job_unit
    ON job_unit_yearly_value (job_unit_id);


-- =============================================================================
-- JOB UNIT ALLOCATION  (self-referencing FK for split rows)
-- =============================================================================

CREATE TABLE job_unit_allocation (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    job_unit_id         UUID         NOT NULL REFERENCES job_unit(id) ON DELETE RESTRICT,
    -- Non-null on split child rows; null on unsplit or split parent rows
    parent_id           UUID         NULL REFERENCES job_unit_allocation(id) ON DELETE CASCADE,
    society             TEXT         NULL,
    cost_type           TEXT         NOT NULL DEFAULT 'FTE' CHECK (cost_type IN ('FTE', 'TSA', 'TC')),
    -- Only set on split child rows; must sum to 100 across siblings
    percentage          NUMERIC(5,2) NULL CHECK (
                            percentage IS NULL OR (percentage > 0 AND percentage <= 100)),
    -- For H-DESIGN / H-TESTING diversity dropdown rules
    diversity_selection TEXT         NULL CHECK (
                            diversity_selection IN ('society_site', 'variants')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jua_job_unit
    ON job_unit_allocation (job_unit_id);

CREATE INDEX idx_jua_parent
    ON job_unit_allocation (parent_id)
    WHERE parent_id IS NOT NULL;

-- Grid query: exclude split parents (rows that have active children)
-- Usage: WHERE parent_id IS NULL
--          AND NOT EXISTS (SELECT 1 FROM job_unit_allocation c WHERE c.parent_id = job_unit_allocation.id)
-- This index accelerates the EXISTS subquery
CREATE INDEX idx_jua_children_lookup
    ON job_unit_allocation (parent_id)
    WHERE parent_id IS NOT NULL;


-- Yearly FTE and K€ per allocation row (CASCADE: removed when split is undone)
CREATE TABLE job_unit_allocation_yearly_value (
    id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID     NOT NULL REFERENCES job_unit_allocation(id) ON DELETE CASCADE,
    year          INT      NOT NULL,
    fte           NUMERIC  NOT NULL DEFAULT 0,
    keuro         NUMERIC  NOT NULL DEFAULT 0,
    UNIQUE (allocation_id, year)
);

CREATE INDEX idx_juayv_allocation
    ON job_unit_allocation_yearly_value (allocation_id);


-- =============================================================================
-- K€ RATES  (replaces keuro_rates.py hardcoded config)
-- =============================================================================

CREATE TABLE keuro_rate (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    society_site    TEXT        NOT NULL,
    cost_type       TEXT        NOT NULL CHECK (cost_type IN ('FTE', 'TSA')),
    year            INT         NOT NULL,
    rate            NUMERIC     NOT NULL,
    valid_from      DATE        NOT NULL,
    created_by_oid  TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_keuro_rate
    ON keuro_rate (society_site, cost_type, year, valid_from);


-- =============================================================================
-- ALLOCATION RULES  (replaces Allocation Rules.xlsx — versioned per métier)
-- =============================================================================

CREATE TABLE allocation_rule_version (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    metier          TEXT        NOT NULL CHECK (metier IN (
                        'H-DESIGN', 'H-TUNING', 'H-SOFTWARE', 'H-CUSTOMER',
                        'H-PROJECT', 'H-NP', 'H-TESTING')),
    version_number  TEXT        NOT NULL,
    uploaded_by_oid  TEXT        NOT NULL,
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active        BOOLEAN     NOT NULL DEFAULT true,
    -- If true, re-apply rules on upload to unassigned JUs on Approved PLs for this métier
    apply_on_upload  BOOLEAN     NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_alloc_rule_version_active
    ON allocation_rule_version (metier)
    WHERE is_active = true;


CREATE TABLE allocation_rule (
    id                 UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id         UUID     NOT NULL REFERENCES allocation_rule_version(id) ON DELETE RESTRICT,
    -- Matching fields — NULL = wildcard (matches any value); non-null = CONTAINS match
    organ_type         TEXT     NULL,
    fuel_type          TEXT     NULL,
    ranking            TEXT     NULL,
    alliance_code      TEXT     NULL,
    vehicle_code       TEXT     NULL,
    standard_emissions TEXT     NULL,
    market             TEXT     NULL,
    injection_system   TEXT     NULL,
    part_type          TEXT     NULL,
    -- Result
    society            TEXT     NOT NULL,
    -- Rule behavior flags
    is_exception       BOOLEAN  NOT NULL DEFAULT false,
    -- Diversity dropdown (H-DESIGN, H-TESTING, H-CUSTOMER)
    diversity_flag     BOOLEAN  NOT NULL DEFAULT false,
    ju_codes           TEXT[]   NULL,   -- JU codes that trigger diversity selection
    variant_societies  TEXT[]   NULL,   -- options shown in variants dropdown
    -- Tie-breaking: higher priority wins; equal priority = last row_order wins
    priority           INT      NOT NULL DEFAULT 0,
    row_order          INT      NOT NULL DEFAULT 0
);

CREATE INDEX idx_allocation_rule_version
    ON allocation_rule (version_id);


-- =============================================================================
-- DISTRIBUTION CONFIG  (replaces hardcoded distribution_config in estimation.py)
-- =============================================================================

CREATE TABLE metier_distribution_config (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    metier          TEXT        NOT NULL CHECK (metier IN (
                        'H-DESIGN', 'H-TUNING', 'H-SOFTWARE', 'H-CUSTOMER')),
    sp_pc           NUMERIC(6,4) NOT NULL,
    pc_co           NUMERIC(6,4) NOT NULL,
    co_sop          NUMERIC(6,4) NOT NULL,
    valid_from      DATE         NOT NULL,
    created_by_oid  TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_distribution_sum CHECK (
        ROUND(sp_pc + pc_co + co_sop, 4) = 1.0)
);

CREATE UNIQUE INDEX uq_metier_dist_config
    ON metier_distribution_config (metier, valid_from);


-- =============================================================================
-- PROTOTYPE ESTIMATION  (one row per project line; fixed categories)
-- =============================================================================

CREATE TABLE prototype_estimation (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_line_id  UUID        NOT NULL UNIQUE REFERENCES project_line(id) ON DELETE RESTRICT,
    proto_1          NUMERIC     NOT NULL DEFAULT 0,
    proto_2          NUMERIC     NOT NULL DEFAULT 0,
    proto_3          NUMERIC     NOT NULL DEFAULT 0,
    comment          TEXT        NULL,
    updated_by_oid   TEXT        NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- HVT INTEGRATION AUDIT LOG
-- =============================================================================

CREATE TABLE hvt_audit_log (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    direction    TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    stage        TEXT        NOT NULL CHECK (stage IN ('1', '2-send', '2-callback', '3')),
    http_status  INT         NULL,
    -- Key identifiers only (e.g. PL count, list of PL numbers) — not full payload
    summary      TEXT        NULL,
    result       TEXT        NOT NULL CHECK (result IN ('success', 'failure')),
    error_detail TEXT        NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hvt_audit_created
    ON hvt_audit_log (created_at DESC);


-- =============================================================================
-- EMAIL SEND LOG
-- =============================================================================

CREATE TABLE email_send_log (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_oid  TEXT        NOT NULL,
    alert_type     TEXT        NOT NULL CHECK (alert_type IN (
                       'engineer_weekly', 'rcrc_weekly', 'rejection_notification')),
    cycle_id       UUID        NULL REFERENCES estimation_cycle(id) ON DELETE SET NULL,
    success        BOOLEAN     NOT NULL,
    error_detail   TEXT        NULL,
    sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_sent_at
    ON email_send_log (sent_at DESC);


-- =============================================================================
-- AUTO-UPDATE TRIGGERS  (updated_at)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_line_updated_at
    BEFORE UPDATE ON project_line
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inductor_updated_at
    BEFORE UPDATE ON inductor
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_job_unit_updated_at
    BEFORE UPDATE ON job_unit
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_job_unit_allocation_updated_at
    BEFORE UPDATE ON job_unit_allocation
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prototype_estimation_updated_at
    BEFORE UPDATE ON prototype_estimation
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- JOB UNIT METIER VALIDATION TRIGGER
-- =============================================================================
-- Enforces: if unit_type IN ('Bench Hours', 'Kilometres') → metier = 'H-TESTING'
--           else → metier must match project_line.metier
-- Runs on INSERT and UPDATE of job_unit.

CREATE OR REPLACE FUNCTION validate_job_unit_metier()
RETURNS TRIGGER AS $$
DECLARE
    pl_metier TEXT;
BEGIN
    -- Fetch the project line's metier
    SELECT metier INTO pl_metier
    FROM project_line
    WHERE id = NEW.project_line_id;

    IF pl_metier IS NULL THEN
        RAISE EXCEPTION 'project_line_id % not found', NEW.project_line_id;
    END IF;

    -- BH/KM → must be H-TESTING
    IF NEW.unit_type IN ('Bench Hours', 'Kilometres') THEN
        IF NEW.metier != 'H-TESTING' THEN
            RAISE EXCEPTION 'Job unit with unit_type % must have metier H-TESTING. Got: %',
                NEW.unit_type, NEW.metier;
        END IF;
    ELSE
        -- Man Day / Kiloeuros → must match project_line.metier
        IF NEW.metier != pl_metier THEN
            RAISE EXCEPTION 'Job unit metier % does not match project_line metier %',
                NEW.metier, pl_metier;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_unit_metier_validate
    BEFORE INSERT OR UPDATE ON job_unit
    FOR EACH ROW EXECUTE FUNCTION validate_job_unit_metier();
