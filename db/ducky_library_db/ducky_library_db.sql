CREATE DATABASE ducky_library_db;
\c ducky_library_db;

-- Domains
CREATE DOMAIN sys_email AS VARCHAR(255)
  CHECK(
    VALUE ~* '^(?!.*\.\..*)(?!\..*)[A-Za-z0-9\.\_\%\+\-]+@(?!^\-.*$)(?!^.*\-$)(?!^..\-\-*$)([A-Za-z0-9\-]){1,253}.([a-z0-9\-]){2,63}$'
  );

CREATE DOMAIN generic_phone AS VARCHAR(15)
  CHECK(VALUE ~ '^\+?([\d\s-]){9,15}$');

CREATE DOMAIN maps_scale AS VARCHAR(50)
  CHECK(VALUE ~ '^\d+:\d+$');

-- Enums
CREATE TYPE media_type AS ENUM(
  'book', 'journal_magazine', 'thesis_dissertation', 'reference', 'digital_article',
  'conference_proceeding', 'government_document', 'musical_score', 'e_book', 'e_journal',
  'dataset', 'software', 'audio_music', 'audio_spoken', 'video', 'map', 'microform',
  'visual_art', 'manuscript', 'ephemera', 'relia_3d_object', 'mixed_media'
);
CREATE TYPE media_state AS ENUM('available', 'disabled');
CREATE TYPE collaborator_type AS ENUM(
  'coauthor', 'illustrator', 'editor', 'compiler', 'photographer', 'translator',
  'indexer', 'annotator', 'cartographer', 'narrator'
);
CREATE TYPE physical_media_health_state AS ENUM('good', 'damaged', 'incomplete', 'lost');
CREATE TYPE physical_media_op_state AS ENUM(
  'available', 'on loan', 'reserved', 'internal consultation only', 'in transit'
);
CREATE TYPE polarity_type AS ENUM('negative', 'positive');
CREATE TYPE publication_frequency AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'annually');
CREATE TYPE file_format AS ENUM('pdf', 'epub', 'daisy');
CREATE TYPE license_model AS ENUM('oc-ou', 'concurrent', 'unlimited', 'metered');
CREATE TYPE maps_type AS ENUM(
  'topograhpic', 'thematic', 'political', 'road', 'nautical', 'aeronautical',
  'cadastral', 'satellite', 'other'
);
CREATE TYPE media_loan AS ENUM('active', 'overdue', 'completed');
CREATE TYPE damage_type AS ENUM(
  'torn pages', 'foxing', 'cockling', 'dog-eared', 'staining/decoloration',
  'broken/loose spine', 'damaged cover', 'crushed corner', 'hinge damaged',
  'mold', 'pest damage', 'light damage', 'annotations/markings', 'improper repair',
  'shelf wear'
);
CREATE TYPE severity_level AS ENUM('low', 'medium', 'high');

-- Tables
CREATE TABLE collaborators(
  colaborator_id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  father_lastname VARCHAR(50) NOT NULL,
  mother_lastname VARCHAR(50),
  nationality_id INT
);

CREATE TABLE resources(
  resource_id BIGSERIAL PRIMARY KEY,
  resource_title VARCHAR(500) NOT NULL,
  author_principal_id BIGINT,
  publisher_id BIGINT,
  resource_publication_year SMALLINT,
  resource_type media_type NOT NULL,
  resource_cost NUMERIC(12,2) CHECK(resource_cost >= 0),
  resource_state media_state NOT NULL,
  vendor_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL,
  created_by BIGINT NOT NULL,
  latest_modified_at TIMESTAMPTZ NOT NULL,
  latest_modified_by BIGINT NOT NULL,
  disabled_at TIMESTAMPTZ,
  disabled_by BIGINT
);

-- Organizations / Countries
CREATE TABLE countries(
  country_id SERIAL PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  country_iso_code VARCHAR(3) NOT NULL
    CHECK(country_iso_code ~ '^[A-Z]{2,3}$')
);

CREATE TABLE organizations(
  organization_id BIGSERIAL PRIMARY KEY,
  organization_name VARCHAR(255) NOT NULL,
  organization_website_url VARCHAR(2083)
);

CREATE TABLE vendors(
  vendor_id BIGINT PRIMARY KEY REFERENCES organizations(organization_id),
  vendor_email sys_email NOT NULL,
  vendor_phone generic_phone NOT NULL,
  country_origin_id INT REFERENCES countries(country_id)
);

CREATE TABLE publishers(
  publisher_id BIGINT PRIMARY KEY REFERENCES organizations(organization_id)
);

-- Add foreign keys that were temporarily removed to avoid dependency ordering issues
ALTER TABLE collaborators
  ADD CONSTRAINT collaborators_nationality_fk FOREIGN KEY (nationality_id) REFERENCES countries(country_id);

ALTER TABLE resources
  ADD CONSTRAINT resources_author_principal_fk FOREIGN KEY (author_principal_id) REFERENCES collaborators(colaborator_id);

ALTER TABLE resources
  ADD CONSTRAINT resources_publisher_fk FOREIGN KEY (publisher_id) REFERENCES organizations(organization_id);

-- Collaborator / Resource relationship
CREATE TABLE collaborators_resources(
  colaborator_id BIGINT NOT NULL REFERENCES collaborators(colaborator_id),
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  colaborator_type collaborator_type NOT NULL,
  PRIMARY KEY(colaborator_id, resource_id)
);

-- Physical examples
CREATE TABLE physical_examples(
  barcode VARCHAR(14) PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  example_location_code VARCHAR(50) NOT NULL,
  example_health_state physical_media_health_state NOT NULL,
  example_op_state physical_media_op_state NOT NULL,
  latest_modified_at TIMESTAMPTZ NOT NULL,
  latest_modified_by BIGINT NOT NULL
);

CREATE TABLE book_metadata(
  resource_id BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  book_isbn VARCHAR(13) UNIQUE,
  book_edition_number SMALLINT,
  book_publication_date DATE,
  book_publication_location VARCHAR(255),
  book_synopsis VARCHAR(1000),
  book_page_count SMALLINT
);

CREATE TABLE microform_metadata(
  resource_id BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  film_size SMALLINT NOT NULL,
  film_reduction DECIMAL(5,2) NOT NULL,
  film_polarity polarity_type NOT NULL
);

CREATE TABLE periodical_metadata(
  resource_id BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  periodical_issn VARCHAR(8),
  periodical_frequency publication_frequency NOT NULL,
  peer_reviewed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE digital_metadata(
  resource_id BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  digital_file_format file_format NOT NULL,
  digital_file_size INT NOT NULL,
  digital_url_link VARCHAR(2083) NOT NULL,
  digital_license_model license_model NOT NULL,
  digital_max_concurrent_users SMALLINT,
  digital_total_users_allows SMALLINT
);

CREATE TABLE audiovisual_metadata(
  resource_id BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  audiovisual_minutes SMALLINT NOT NULL CHECK(audiovisual_minutes > 0)
);

CREATE TABLE maps_metadata(
  resource_id BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  maps_scale maps_scale,
  maps_projection_type VARCHAR(100) CHECK(maps_projection_type = LOWER(maps_projection_type)),
  maps_type maps_type
);

-- "Article metadata" in the CSV uses column name `barcode` but it is defined as FK(resources).
-- To keep the FK valid, we model it as BIGINT referencing resources(resource_id).
CREATE TABLE article_metadata(
  barcode BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  article_issue SMALLINT,
  article_volume SMALLINT,
  article_year SMALLINT CHECK(article_year > 0)
);

CREATE TABLE digital_articles(
  resource_child_id BIGINT PRIMARY KEY REFERENCES resources(resource_id),
  resource_parent_id BIGINT NOT NULL REFERENCES resources(resource_id),
  digital_article_issue SMALLINT,
  digital_article_volume SMALLINT,
  digital_article_year SMALLINT CHECK(digital_article_year > 0)
);

-- Categories
CREATE TABLE categories(
  category_id SMALLINT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE
    CHECK(category_name ~ '^[a-z]+$' AND category_name = LOWER(category_name))
);

CREATE TABLE categories_hierarchy(
  child_category_id SMALLINT NOT NULL REFERENCES categories(category_id),
  parent_category_id SMALLINT NOT NULL REFERENCES categories(category_id),
  PRIMARY KEY(child_category_id, parent_category_id),
  CHECK(child_category_id <> parent_category_id)
);

CREATE TABLE categories_resources(
  category_id SMALLINT NOT NULL REFERENCES categories(category_id),
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  PRIMARY KEY(category_id, resource_id)
);

-- Languages + translations
CREATE TABLE languages(
  language_id SERIAL PRIMARY KEY,
  language_name VARCHAR(100) NOT NULL,
  language_iso_code VARCHAR(3) NOT NULL CHECK(language_iso_code ~ '^[a-z]{2,3}$')
);

CREATE TABLE supplementary_languages(
  language_id INT NOT NULL REFERENCES languages(language_id),
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  PRIMARY KEY(language_id, resource_id)
);

-- Loans / reservations
CREATE TABLE physical_loans(
  loan_id BIGSERIAL PRIMARY KEY,
  barcode VARCHAR(14) NOT NULL REFERENCES physical_examples(barcode),
  campus_id BIGINT NOT NULL,
  initial_lent_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  loan_state media_loan NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by BIGINT NOT NULL,
  latest_modified_at TIMESTAMPTZ NOT NULL,
  latest_modified_by BIGINT NOT NULL
);

CREATE TABLE physical_loan_renewals(
  physical_renewal_id BIGSERIAL PRIMARY KEY,
  loan_id BIGINT NOT NULL REFERENCES physical_loans(loan_id),
  renewal_lent_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE digital_loans(
  digital_loan_id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  campus_id BIGINT NOT NULL,
  initial_lent_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  digital_loan_state media_loan NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by BIGINT NOT NULL,
  latest_modified_at TIMESTAMPTZ NOT NULL,
  latest_modified_by BIGINT NOT NULL
);

CREATE TABLE digital_loan_renewals(
  digital_renewal_id BIGSERIAL PRIMARY KEY,
  digital_loan_id BIGINT NOT NULL REFERENCES digital_loans(digital_loan_id),
  renewal_lent_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE images(
  image_id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  image_url VARCHAR(2083) NOT NULL,
  image_caption VARCHAR(1000)
);

-- Keywords
CREATE TABLE keywords(
  keyword_id BIGSERIAL PRIMARY KEY,
  keyword VARCHAR(50) NOT NULL UNIQUE CHECK(keyword ~ '^[a-z]+$')
);

CREATE TABLE keywords_resources(
  keyword_id BIGINT NOT NULL REFERENCES keywords(keyword_id),
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  PRIMARY KEY(keyword_id, resource_id)
);

CREATE TABLE keyword_translations(
  keyword_translation_id BIGSERIAL PRIMARY KEY,
  keyword_id BIGINT NOT NULL REFERENCES keywords(keyword_id),
  language_id INT NOT NULL REFERENCES languages(language_id),
  keyword_translation VARCHAR(60) NOT NULL CHECK(keyword_translation ~ '^[a-z]+$')
);

CREATE TABLE resource_labels(
  label_id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  language_id INT NOT NULL REFERENCES languages(language_id),
  resource_title VARCHAR(600) NOT NULL,
  resource_is_primary BOOLEAN NOT NULL
);

CREATE TABLE reservations(
  reservation_id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES resources(resource_id),
  campus_id BIGINT NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE damaged_resource_details(
  barcode VARCHAR(14) PRIMARY KEY REFERENCES physical_examples(barcode),
  damage_type damage_type NOT NULL,
  severity_level severity_level NOT NULL,
  librarian_notes VARCHAR(255) NOT NULL
);

CREATE TABLE lost_resource_details(
  barcode VARCHAR(14) PRIMARY KEY REFERENCES physical_examples(barcode),
  librarian_notes VARCHAR(255) NOT NULL
);
