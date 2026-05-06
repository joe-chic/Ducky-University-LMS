-- Dummy data for ducky_library_db
-- Global affiliate IDs used across DBs:
--   employees: 1001, 1002, 1003
--   students:  2001, 2002, 2003

\c ducky_library_db;

-- Countries
INSERT INTO countries(country_id, country_name, country_iso_code)
VALUES
  (1, 'Mexico', 'MEX');

-- Organizations
INSERT INTO organizations(organization_id, organization_name, organization_website_url)
VALUES
  (1, 'The New York Times', 'https://advertising.nytimes.com/'),
  (2, 'Acme Publishing', 'https://acme.example');

-- Vendors / Publishers
INSERT INTO vendors(vendor_id, vendor_email, vendor_phone, country_origin_id)
VALUES
  (1, 'vendor1@nytimes.com', '555-555-0199', 1);

INSERT INTO publishers(publisher_id)
VALUES
  (2);

-- Languages
INSERT INTO languages(language_id, language_name, language_iso_code)
VALUES
  (1, 'German', 'de'),
  (2, 'English', 'en');

-- Categories
INSERT INTO categories(category_id, category_name)
VALUES
  (1, 'fiction'),
  (2, 'science');

INSERT INTO categories_hierarchy(child_category_id, parent_category_id)
VALUES
  (1, 2);

-- Collaborators
INSERT INTO collaborators(colaborator_id, first_name, middle_name, father_lastname, mother_lastname, nationality_id)
VALUES
  (3001, 'F. Scott', NULL, 'Fitzgerald', 'F.', 1);

-- Resources
INSERT INTO resources(
  resource_id, resource_title, author_principal_id, publisher_id, resource_publication_year,
  resource_type, resource_cost, resource_state, vendor_id,
  created_at, created_by, latest_modified_at, latest_modified_by, disabled_at, disabled_by
)
VALUES
  (5001, 'The Great Gatsby', 3001, 2, 2005, 'book', 19.99, 'available', 1,
   '2025-10-27T10:00:00-04', 1, '2025-10-27T11:00:00-04', 1, NULL, NULL);

INSERT INTO resources(
  resource_id, resource_title, author_principal_id, publisher_id, resource_publication_year,
  resource_type, resource_cost, resource_state, vendor_id,
  created_at, created_by, latest_modified_at, latest_modified_by, disabled_at, disabled_by
)
VALUES
  (5002, 'Quantum Mechanics Overview', NULL, 2, 2024, 'digital_article', 9.99, 'available', 1,
   '2025-10-27T10:10:00-04', 1, '2025-10-27T11:10:00-04', 1, NULL, NULL);

-- Collaborator <-> Resource
INSERT INTO collaborators_resources(colaborator_id, resource_id, colaborator_type)
VALUES
  (3001, 5001, 'coauthor');

-- Metadata
INSERT INTO book_metadata(
  resource_id, book_isbn, book_edition_number, book_publication_date, book_publication_location,
  book_synopsis, book_page_count
)
VALUES
  (5001, '9783161484100', 1, '2024-05-20', 'New York',
   'Set in the Roaring Twenties, this is a synopsis for The Great Gatsby.', 180);

INSERT INTO digital_metadata(
  resource_id, digital_file_format, digital_file_size, digital_url_link,
  digital_license_model, digital_max_concurrent_users, digital_total_users_allows
)
VALUES
  (5002, 'pdf', 50, 'https://www.planetebook.com/free-ebooks/the-great-gatsby.pdf', 'unlimited', 10, 100);

-- Supplementary languages for resource 5001
INSERT INTO supplementary_languages(language_id, resource_id)
VALUES
  (1, 5001),
  (2, 5001);

-- Resource labels (translated title)
INSERT INTO resource_labels(label_id, resource_id, language_id, resource_title, resource_is_primary)
VALUES
  (7001, 5001, 1, 'Der große Gatsby', TRUE);

-- Resources in categories
INSERT INTO categories_resources(category_id, resource_id)
VALUES
  (1, 5001);

-- Physical examples (book items)
INSERT INTO physical_examples(
  barcode, resource_id, example_location_code, example_health_state, example_op_state,
  latest_modified_at, latest_modified_by
)
VALUES
  ('PHY-5001', 5001, 'MAIN-FL1-REF-S1', 'good', 'available', '2025-10-27T11:30:00-04', 1),
  ('PHY-5002', 5001, 'MAIN-FL2-FIC-A3', 'damaged', 'on loan', '2025-10-28T10:00:00-04', 1),
  ('PHY-5003', 5001, 'MAIN-FL2-FIC-A4', 'good', 'available', '2025-10-28T10:30:00-04', 1);

-- Keywords
INSERT INTO keywords(keyword_id, keyword)
VALUES
  (9001, 'fiction');

INSERT INTO keywords_resources(keyword_id, resource_id)
VALUES
  (9001, 5001);

INSERT INTO keyword_translations(keyword_translation_id, keyword_id, language_id, keyword_translation)
VALUES
  (9101, 9001, 1, 'fiktion');

-- Image
INSERT INTO images(image_id, resource_id, image_url, image_caption)
VALUES
  (9501, 5001, 'https://miro.medium.com/v2/1*SdXRP8f2Lhin89Tht_GRIA.jpeg', 'Cover image (dummy)');

-- Loans and reservations
-- Physical loan for student 2001
INSERT INTO physical_loans(
  loan_id, barcode, campus_id, initial_lent_at, returned_at,
  loan_state, created_at, created_by, latest_modified_at, latest_modified_by
)
VALUES
  (6001, 'PHY-5001', 2001, '2023-10-27T10:00:00-04', '2023-12-01T10:00:00-04',
   'completed', '2023-10-27T10:00:00-04', 1, '2023-12-01T10:00:00-04', 1);

INSERT INTO physical_loan_renewals(physical_renewal_id, loan_id, renewal_lent_at)
VALUES
  (6101, 6001, '2023-11-01T10:00:00-04');

-- Digital loan for employee 1002
INSERT INTO digital_loans(
  digital_loan_id, resource_id, campus_id, initial_lent_at,
  digital_loan_state, created_at, created_by, latest_modified_at, latest_modified_by
)
VALUES
  (7001, 5002, 1002, '2023-10-27T10:00:00-04',
   'active', '2023-10-27T10:00:00-04', 1, '2023-10-27T10:30:00-04', 1);

INSERT INTO digital_loan_renewals(digital_loan_id, digital_renewal_id, renewal_lent_at)
VALUES
  (7001, 7101, '2023-11-01T10:00:00-04');

-- Reservation for employee 1003
INSERT INTO reservations(reservation_id, resource_id, campus_id, reserved_at, created_at)
VALUES
  (7201, 5001, 1003, '2023-10-27T15:00:00-04', '2023-10-27T15:00:00-03');

-- Fix sequences after explicit inserts
SELECT setval(pg_get_serial_sequence('countries','country_id'), (SELECT COALESCE(MAX(country_id), 1) FROM countries));
SELECT setval(pg_get_serial_sequence('organizations','organization_id'), (SELECT COALESCE(MAX(organization_id), 1) FROM organizations));
SELECT setval(pg_get_serial_sequence('languages','language_id'), (SELECT COALESCE(MAX(language_id), 1) FROM languages));
SELECT setval(pg_get_serial_sequence('collaborators','colaborator_id'), (SELECT COALESCE(MAX(colaborator_id), 1) FROM collaborators));
SELECT setval(pg_get_serial_sequence('resources','resource_id'), (SELECT COALESCE(MAX(resource_id), 1) FROM resources));
SELECT setval(pg_get_serial_sequence('keywords','keyword_id'), (SELECT COALESCE(MAX(keyword_id), 1) FROM keywords));
SELECT setval(pg_get_serial_sequence('images','image_id'), (SELECT COALESCE(MAX(image_id), 1) FROM images));
SELECT setval(pg_get_serial_sequence('physical_loans','loan_id'), (SELECT COALESCE(MAX(loan_id), 1) FROM physical_loans));
SELECT setval(pg_get_serial_sequence('physical_loan_renewals','physical_renewal_id'), (SELECT COALESCE(MAX(physical_renewal_id), 1) FROM physical_loan_renewals));
SELECT setval(pg_get_serial_sequence('digital_loans','digital_loan_id'), (SELECT COALESCE(MAX(digital_loan_id), 1) FROM digital_loans));
SELECT setval(pg_get_serial_sequence('digital_loan_renewals','digital_renewal_id'), (SELECT COALESCE(MAX(digital_renewal_id), 1) FROM digital_loan_renewals));
SELECT setval(pg_get_serial_sequence('reservations','reservation_id'), (SELECT COALESCE(MAX(reservation_id), 1) FROM reservations));
SELECT setval(pg_get_serial_sequence('resource_labels','label_id'), (SELECT COALESCE(MAX(label_id), 1) FROM resource_labels));

