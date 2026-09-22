-- Insertion de quelques panneaux
INSERT IGNORE INTO PANNEau (nom, adresse, latitude, longitude, province, ville, commune, etat) VALUES
('Panneau Gambela', 'Avenue de la Libération, Kinshasa', -4.3250, 15.3222, 'Kinshasa', 'Kinshasa', 'Gombe', 'Actif'),
('Panneau Kintambo', 'Boulevard Lumumba, Kinshasa', -4.3525, 15.3125, 'Kinshasa', 'Kinshasa', 'Kintambo', 'Actif'),
('Panneau Limete', 'Route Matadi, Kinshasa', -4.3783, 15.3250, 'Kinshasa', 'Kinshasa', 'Limete', 'Actif'),
('Panneau Ngaba', 'Avenue des Huileries, Kinshasa', -4.3900, 15.3180, 'Kinshasa', 'Kinshasa', 'Ngaba', 'Actif');

-- Insertion de quelques faces
INSERT IGNORE INTO FACE (id_panneau, id_type_face, orientation) VALUES
(1, 1, 'Nord'), (1, 1, 'Sud'), (1, 2, 'Est'),
(2, 1, 'Nord'), (2, 2, 'Sud'),
(3, 1, 'Nord'), (3, 2, 'Sud'), (3, 3, 'Est'),
(4, 1, 'Nord'), (4, 1, 'Sud');
