-- Create the database
CREATE DATABASE IF NOT EXISTS compliance_db;
USE compliance_db;

-- Create the notes table
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- e.g., 'Study', 'Assignment', 'Personal'
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 3 sample records
INSERT INTO notes (title, description, category, status) VALUES 
('Math Homework', 'Complete exercises 10-15 on page 42', 'School', 'pending'),
('Buy Groceries', 'Milk, Eggs, and Bread', 'Personal', 'completed'),
('Project Meeting', 'Discuss the Projects', 'Work', 'pending');

