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



-- ============================================================================
-- EXTRA BOOKS DATA (30 CLASSICS)
-- ============================================================================

-- Extra publishers/organizations
INSERT INTO organizations(organization_id, organization_name, organization_website_url) VALUES
  (3, 'Penguin Books', 'https://www.penguin.com'),
  (4, 'HarperCollins', 'https://www.harpercollins.com'),
  (5, 'Scribner', 'https://www.simonandschuster.com/imprints/scribner'),
  (6, 'Vintage Books', 'https://www.vintagebooks.com')
ON CONFLICT DO NOTHING;

INSERT INTO publishers(publisher_id) VALUES (3),(4),(5),(6) ON CONFLICT DO NOTHING;

-- Extra languages
INSERT INTO languages(language_id, language_name, language_iso_code) VALUES
  (3, 'Spanish', 'es'),
  (4, 'French',  'fr'),
  (5, 'Japanese','ja')
ON CONFLICT DO NOTHING;

-- Extra categories
INSERT INTO categories(category_id, category_name) VALUES
  (3,  'classic'),
  (4,  'dystopian'),
  (5,  'mystery'),
  (6,  'biography'),
  (7,  'philosophy'),
  (8,  'history'),
  (9,  'self-help'),
  (10, 'adventure'),
  (11, 'romance'),
  (12, 'horror'),
  (13, 'fantasy'),
  (14, 'technology'),
  (15, 'economics')
ON CONFLICT DO NOTHING;

-- Extra collaborators (authors)
INSERT INTO collaborators(colaborator_id, first_name, middle_name, father_lastname, mother_lastname, nationality_id) VALUES
  (3002, 'George',      NULL,  'Orwell',      NULL,        1),
  (3003, 'Harper',      NULL,  'Lee',         NULL,        1),
  (3004, 'J.D.',        NULL,  'Salinger',    NULL,        1),
  (3005, 'Ernest',      NULL,  'Hemingway',   NULL,        1),
  (3006, 'Jane',        NULL,  'Austen',      NULL,        1),
  (3007, 'Gabriel',     NULL,  'García Márquez', NULL,     1),
  (3008, 'Fyodor',      NULL,  'Dostoevsky',  NULL,        1),
  (3009, 'Leo',         NULL,  'Tolstoy',     NULL,        1),
  (3010, 'Franz',       NULL,  'Kafka',       NULL,        1),
  (3011, 'Albert',      NULL,  'Camus',       NULL,        1),
  (3012, 'Aldous',      NULL,  'Huxley',      NULL,        1),
  (3013, 'J.R.R.',      NULL,  'Tolkien',     NULL,        1),
  (3014, 'Ray',         NULL,  'Bradbury',    NULL,        1),
  (3015, 'Isaac',       NULL,  'Asimov',      NULL,        1),
  (3016, 'Agatha',      NULL,  'Christie',    NULL,        1),
  (3017, 'Haruki',      NULL,  'Murakami',    NULL,        1),
  (3018, 'Paulo',       NULL,  'Coelho',      NULL,        1),
  (3019, 'Toni',        NULL,  'Morrison',    NULL,        1),
  (3020, 'Virginia',    NULL,  'Woolf',       NULL,        1),
  (3021, 'Herman',      NULL,  'Melville',    NULL,        1),
  (3022, 'Mark',        NULL,  'Twain',       NULL,        1),
  (3023, 'Charles',     NULL,  'Dickens',     NULL,        1),
  (3024, 'Oscar',       NULL,  'Wilde',       NULL,        1),
  (3025, 'Arthur',      NULL,  'Conan Doyle', NULL,        1),
  (3026, 'Dante',       NULL,  'Alighieri',   NULL,        1),
  (3027, 'Homer',       NULL,  'Ancient',     NULL,        1),
  (3028, 'Miguel',      'de',  'Cervantes',   NULL,        1),
  (3029, 'Simone',      'de',  'Beauvoir',    NULL,        1),
  (3030, 'Yuval',       'Noah','Harari',      NULL,        1)
ON CONFLICT DO NOTHING;

-- 30 book resources
INSERT INTO resources(resource_id, resource_title, author_principal_id, publisher_id, resource_publication_year, resource_type, resource_cost, resource_state, vendor_id, created_at, created_by, latest_modified_at, latest_modified_by, disabled_at, disabled_by) VALUES
  (5003, '1984',                          3002, 3, 1949, 'book', 14.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5004, 'To Kill a Mockingbird',         3003, 4, 1960, 'book', 13.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5005, 'The Catcher in the Rye',        3004, 5, 1951, 'book', 12.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5006, 'The Old Man and the Sea',       3005, 3, 1952, 'book', 11.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5007, 'Pride and Prejudice',           3006, 6, 1813, 'book', 10.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5008, 'One Hundred Years of Solitude', 3007, 3, 1967, 'book', 16.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5009, 'Crime and Punishment',          3008, 4, 1866, 'book', 15.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5010, 'War and Peace',                 3009, 5, 1869, 'book', 18.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5011, 'The Metamorphosis',             3010, 6, 1915, 'book', 9.99,  'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5012, 'The Stranger',                  3011, 3, 1942, 'book', 11.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5013, 'Brave New World',               3012, 4, 1932, 'book', 13.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5014, 'The Hobbit',                    3013, 5, 1937, 'book', 17.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5015, 'Fahrenheit 451',                3014, 6, 1953, 'book', 12.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5016, 'Foundation',                    3015, 3, 1951, 'book', 14.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5017, 'Murder on the Orient Express',  3016, 4, 1934, 'book', 12.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5018, 'Norwegian Wood',                3017, 5, 1987, 'book', 15.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5019, 'The Alchemist',                 3018, 6, 1988, 'book', 13.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5020, 'Beloved',                       3019, 3, 1987, 'book', 14.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5021, 'Mrs Dalloway',                  3020, 4, 1925, 'book', 11.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5022, 'Moby Dick',                     3021, 5, 1851, 'book', 13.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5023, 'Adventures of Huckleberry Finn',3022, 6, 1884, 'book', 10.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5024, 'A Tale of Two Cities',          3023, 3, 1859, 'book', 11.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5025, 'The Picture of Dorian Gray',    3024, 4, 1890, 'book', 10.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5026, 'The Hound of the Baskervilles', 3025, 5, 1902, 'book', 11.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5027, 'Divine Comedy',                 3026, 6, 1320, 'book', 16.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5028, 'The Odyssey',                   3027, 3, 2004, 'book', 14.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5029, 'Don Quixote',                   3028, 4, 1605, 'book', 15.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5030, 'The Second Sex',                3029, 5, 1949, 'book', 16.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5031, 'Sapiens',                       3030, 6, 2011, 'book', 18.99, 'available', 1, NOW(), 1, NOW(), 1, NULL, NULL),
  (5032, 'Animal Farm',                   3002, 3, 1945, 'book', 9.99,  'available', 1, NOW(), 1, NOW(), 1, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Book metadata for all 30 books
INSERT INTO book_metadata(resource_id, book_isbn, book_edition_number, book_publication_date, book_publication_location, book_synopsis, book_page_count) VALUES
  (5003, '9780451524935', 1, '1949-06-08', 'London',        'A dystopian novel set in Airstrip One, depicting a totalitarian society under the omnipresent surveillance of Big Brother.', 328),
  (5004, '9780061935466', 1, '1960-07-11', 'Philadelphia',  'A young girl grows up in the American South witnessing racial injustice as her father defends an innocent Black man.', 281),
  (5005, '9780316769174', 1, '1951-07-16', 'New York',      'A teenager recounts his experiences after being expelled from prep school and wandering New York City.', 277),
  (5006, '9780684801223', 1, '1952-09-01', 'New York',      'An aging Cuban fisherman struggles with a giant marlin far out in the Gulf Stream.', 127),
  (5007, '9780141439518', 1, '1813-01-28', 'London',        'The romantic clash between the prejudiced Elizabeth Bennet and the proud Mr. Darcy in Regency England.', 432),
  (5008, '9780060883287', 1, '1967-05-30', 'Buenos Aires',  'The Buendía family saga across seven generations in the mythical town of Macondo, blending reality and magic.', 417),
  (5009, '9780140449136', 1, '1866-01-01', 'St. Petersburg','A student murders a pawnbroker and grapples with guilt, morality, and redemption in 19th-century Russia.', 545),
  (5010, '9781400079988', 1, '1869-01-01', 'Moscow',        'An epic portrayal of Russian society during the Napoleonic era, following five aristocratic families.', 1225),
  (5011, '9780805210576', 1, '1915-10-15', 'Leipzig',       'A travelling salesman awakes one morning to find himself transformed into a giant insect.', 96),
  (5012, '9780679720201', 1, '1942-05-19', 'Paris',         'A French Algerian man shoots an Arab on a beach and examines the absurdity of human existence on trial.', 123),
  (5013, '9780060850524', 1, '1932-10-27', 'London',        'A dystopian satire of a future society based on biological conditioning and pleasurable consumption.', 311),
  (5014, '9780547928227', 1, '1937-09-21', 'London',        'The hobbit Bilbo Baggins joins a company of dwarves to reclaim a treasure guarded by the dragon Smaug.', 310),
  (5015, '9781451673319', 1, '1953-10-19', 'New York',      'In a future society books are banned and burned; a fireman begins to question the system.', 158),
  (5016, '9780553293357', 1, '1951-05-01', 'New York',      'A mathematician develops a science called psychohistory to preserve knowledge through a coming dark age.', 244),
  (5017, '9780062693662', 1, '1934-01-01', 'London',        'A luxury train crosses Europe and a murder victim is found — every passenger is a suspect.', 256),
  (5018, '9780375704024', 1, '1987-09-04', 'Tokyo',         'A young man looks back on his college years in 1960s Tokyo and a love triangle that ended in tragedy.', 296),
  (5019, '9780062315007', 1, '1988-01-01', 'Rio de Janeiro','A shepherd travels from Spain to Egypt following his dream, discovering the soul of the world.', 208),
  (5020, '9781400033416', 1, '1987-09-16', 'New York',      'A former slave is haunted by the ghost of her dead daughter in post-Civil War Ohio.', 321),
  (5021, '9780156628518', 1, '1925-05-14', 'London',        'A single day in the life of Clarissa Dalloway, a wealthy socialite preparing for a party in post-WWI London.', 194),
  (5022, '9780142437247', 1, '1851-10-18', 'New York',      'The obsessive quest of Captain Ahab for revenge against the white sperm whale Moby Dick.', 720),
  (5023, '9780486280615', 1, '1884-12-10', 'New York',      'Huck Finn escapes his abusive father and travels down the Mississippi River with a runaway slave.', 366),
  (5024, '9780141439600', 1, '1859-04-30', 'London',        'Intertwined stories during the French Revolution showing sacrifice, love, and resurrection.', 489),
  (5025, '9780141439570', 1, '1890-06-20', 'London',        'A vain young man sells his soul for eternal youth while his portrait ages in his stead.', 254),
  (5026, '9780140439076', 1, '1902-04-01', 'London',        'Sherlock Holmes investigates a legendary ghostly hound haunting the Baskerville family on Dartmoor.', 248),
  (5027, '9780142437223', 1, '1320-01-01', 'Florence',      'An allegorical journey through Hell, Purgatory, and Paradise guided by Virgil and Beatrice.', 798),
  (5028, '9780140268867', 1, '2004-01-01', 'Ancient Greece','Odysseus takes ten years to return home to Ithaca after the fall of Troy, facing gods and monsters.', 541),
  (5029, '9780060934347', 1, '1605-01-16', 'Madrid',        'An idealistic nobleman reads so many chivalric romances that he decides to become a knight-errant.', 1072),
  (5030, '9780679724513', 1, '1949-06-01', 'Paris',         'An examination of the historical and social treatment of women from antiquity to the present day.', 800),
  (5031, '9780062316097', 1, '2011-01-01', 'Tel Aviv',      'A brief history of humankind from the Stone Age to the present, covering biology, culture, and empire.', 443),
  (5032, '9780451526342', 1, '1945-08-17', 'London',        'Farm animals overthrow their human farmer, but their revolution is gradually corrupted by the pigs.', 112)
ON CONFLICT DO NOTHING;

-- Physical copies for each new book (1-2 per book)
INSERT INTO physical_examples(barcode, resource_id, example_location_code, example_health_state, example_op_state, latest_modified_at, latest_modified_by) VALUES
  ('PHY-5003-A', 5003, 'MAIN-FL1-DYS-A1', 'good',    'available', NOW(), 1),
  ('PHY-5003-B', 5003, 'MAIN-FL1-DYS-A2', 'good',    'available', NOW(), 1),
  ('PHY-5004-A', 5004, 'MAIN-FL1-CLS-B1', 'good',    'available', NOW(), 1),
  ('PHY-5005-A', 5005, 'MAIN-FL1-CLS-B2', 'good',    'available', NOW(), 1),
  ('PHY-5005-B', 5005, 'MAIN-FL2-CLS-B3', 'damaged', 'available', NOW(), 1),
  ('PHY-5006-A', 5006, 'MAIN-FL1-CLS-C1', 'good',    'available', NOW(), 1),
  ('PHY-5007-A', 5007, 'MAIN-FL1-ROM-A1', 'good',    'available', NOW(), 1),
  ('PHY-5007-B', 5007, 'MAIN-FL1-ROM-A2', 'good',    'on loan',   NOW(), 1),
  ('PHY-5008-A', 5008, 'MAIN-FL2-FIC-B1', 'good',    'available', NOW(), 1),
  ('PHY-5009-A', 5009, 'MAIN-FL2-CLS-D1', 'good',    'available', NOW(), 1),
  ('PHY-5010-A', 5010, 'MAIN-FL2-CLS-D2', 'good',    'available', NOW(), 1),
  ('PHY-5011-A', 5011, 'MAIN-FL2-CLS-D3', 'good',    'available', NOW(), 1),
  ('PHY-5012-A', 5012, 'MAIN-FL3-PHI-A1', 'good',    'available', NOW(), 1),
  ('PHY-5013-A', 5013, 'MAIN-FL1-DYS-B1', 'good',    'available', NOW(), 1),
  ('PHY-5013-B', 5013, 'MAIN-FL1-DYS-B2', 'good',    'available', NOW(), 1),
  ('PHY-5014-A', 5014, 'MAIN-FL3-FAN-A1', 'good',    'available', NOW(), 1),
  ('PHY-5015-A', 5015, 'MAIN-FL1-DYS-C1', 'good',    'available', NOW(), 1),
  ('PHY-5016-A', 5016, 'MAIN-FL3-SCI-A1', 'good',    'available', NOW(), 1),
  ('PHY-5017-A', 5017, 'MAIN-FL2-MYS-A1', 'good',    'available', NOW(), 1),
  ('PHY-5017-B', 5017, 'MAIN-FL2-MYS-A2', 'good',    'on loan',   NOW(), 1),
  ('PHY-5018-A', 5018, 'MAIN-FL2-FIC-C1', 'good',    'available', NOW(), 1),
  ('PHY-5019-A', 5019, 'MAIN-FL3-SLF-A1', 'good',    'available', NOW(), 1),
  ('PHY-5020-A', 5020, 'MAIN-FL2-FIC-D1', 'good',    'available', NOW(), 1),
  ('PHY-5021-A', 5021, 'MAIN-FL2-CLS-E1', 'good',    'available', NOW(), 1),
  ('PHY-5022-A', 5022, 'MAIN-FL2-ADV-A1', 'good',    'available', NOW(), 1),
  ('PHY-5023-A', 5023, 'MAIN-FL2-CLS-F1', 'good',    'available', NOW(), 1),
  ('PHY-5024-A', 5024, 'MAIN-FL2-CLS-G1', 'good',    'available', NOW(), 1),
  ('PHY-5025-A', 5025, 'MAIN-FL1-CLS-H1', 'good',    'available', NOW(), 1),
  ('PHY-5026-A', 5026, 'MAIN-FL2-MYS-B1', 'good',    'available', NOW(), 1),
  ('PHY-5027-A', 5027, 'MAIN-FL3-PHI-B1', 'good',    'available', NOW(), 1),
  ('PHY-5028-A', 5028, 'MAIN-FL3-CLS-A1', 'good',    'available', NOW(), 1),
  ('PHY-5029-A', 5029, 'MAIN-FL3-CLS-B1', 'good',    'available', NOW(), 1),
  ('PHY-5030-A', 5030, 'MAIN-FL3-PHI-C1', 'good',    'available', NOW(), 1),
  ('PHY-5031-A', 5031, 'MAIN-FL3-HIS-A1', 'good',    'available', NOW(), 1),
  ('PHY-5031-B', 5031, 'MAIN-FL3-HIS-A2', 'good',    'available', NOW(), 1),
  ('PHY-5032-A', 5032, 'MAIN-FL1-DYS-D1', 'good',    'available', NOW(), 1)
ON CONFLICT DO NOTHING;

-- Categories for all new books
INSERT INTO categories_resources(category_id, resource_id) VALUES
  (4,  5003),(1,  5003),
  (3,  5004),(1,  5004),
  (3,  5005),(1,  5005),
  (3,  5006),(1,  5006),
  (11, 5007),(3,  5007),
  (1,  5008),(3,  5008),
  (3,  5009),(7,  5009),
  (3,  5010),(8,  5010),
  (3,  5011),(7,  5011),
  (7,  5012),(3,  5012),
  (4,  5013),(2,  5013),
  (13, 5014),(10, 5014),
  (4,  5015),(2,  5015),
  (2,  5016),(14, 5016),
  (5,  5017),(3,  5017),
  (1,  5018),(11, 5018),
  (9,  5019),(10, 5019),
  (1,  5020),(3,  5020),
  (3,  5021),(1,  5021),
  (10, 5022),(3,  5022),
  (10, 5023),(3,  5023),
  (3,  5024),(8,  5024),
  (3,  5025),(1,  5025),
  (5,  5026),(3,  5026),
  (7,  5027),(3,  5027),
  (10, 5028),(3,  5028),
  (10, 5029),(3,  5029),
  (7,  5030),(6,  5030),
  (8,  5031),(2,  5031),
  (4,  5032),(1,  5032)
ON CONFLICT DO NOTHING;

-- English language for all new books
INSERT INTO supplementary_languages(language_id, resource_id) VALUES
  (2, 5003),(2, 5004),(2, 5005),(2, 5006),(2, 5007),
  (2, 5008),(2, 5009),(2, 5010),(2, 5011),(2, 5012),
  (2, 5013),(2, 5014),(2, 5015),(2, 5016),(2, 5017),
  (2, 5018),(2, 5019),(2, 5020),(2, 5021),(2, 5022),
  (2, 5023),(2, 5024),(2, 5025),(2, 5026),(2, 5027),
  (2, 5028),(2, 5029),(2, 5030),(2, 5031),(2, 5032)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIX SEQUENCES
-- ============================================================================

SELECT setval(pg_get_serial_sequence('countries','country_id'), (SELECT COALESCE(MAX(country_id), 1) FROM countries));
SELECT setval(pg_get_serial_sequence('organizations','organization_id'), (SELECT COALESCE(MAX(organization_id), 1) FROM organizations));
SELECT setval(pg_get_serial_sequence('languages','language_id'), (SELECT COALESCE(MAX(language_id), 1) FROM languages));
SELECT setval(pg_get_serial_sequence('collaborators','colaborator_id'), (SELECT COALESCE(MAX(colaborator_id), 1) FROM collaborators));
SELECT setval(pg_get_serial_sequence('categories','category_id'), (SELECT COALESCE(MAX(category_id), 1) FROM categories));
SELECT setval(pg_get_serial_sequence('resources','resource_id'), (SELECT COALESCE(MAX(resource_id), 1) FROM resources));
SELECT setval(pg_get_serial_sequence('keywords','keyword_id'), (SELECT COALESCE(MAX(keyword_id), 1) FROM keywords));
SELECT setval(pg_get_serial_sequence('images','image_id'), (SELECT COALESCE(MAX(image_id), 1) FROM images));
SELECT setval(pg_get_serial_sequence('physical_loans','loan_id'), (SELECT COALESCE(MAX(loan_id), 1) FROM physical_loans));
SELECT setval(pg_get_serial_sequence('physical_loan_renewals','physical_renewal_id'), (SELECT COALESCE(MAX(physical_renewal_id), 1) FROM physical_loan_renewals));
SELECT setval(pg_get_serial_sequence('digital_loans','digital_loan_id'), (SELECT COALESCE(MAX(digital_loan_id), 1) FROM digital_loans));
SELECT setval(pg_get_serial_sequence('digital_loan_renewals','digital_renewal_id'), (SELECT COALESCE(MAX(digital_renewal_id), 1) FROM digital_loan_renewals));
SELECT setval(pg_get_serial_sequence('reservations','reservation_id'), (SELECT COALESCE(MAX(reservation_id), 1) FROM reservations));
SELECT setval(pg_get_serial_sequence('resource_labels','label_id'), (SELECT COALESCE(MAX(label_id), 1) FROM resource_labels));
