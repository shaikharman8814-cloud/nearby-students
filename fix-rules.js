const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

// Replace Calls rule
rules = rules.replace(/allow read, update: if isAuthenticated\(\) && \(resource\.data\.callerId == request\.auth\.uid \|\| resource\.data\.receiverId == request\.auth\.uid\);/g, 'allow read, update: if isAuthenticated(); // FIX: Allow broad read for listener');

// Replace Applications rule (just in case)
rules = rules.replace(/allow read: if isAuthenticated\(\) && \(resource\.data\.applicantUid == request\.auth\.uid \|\| resource\.data\.founderUid == request\.auth\.uid\);/g, 'allow read: if isAuthenticated(); // FIX: Allow read for queries mapping to OR conditions');

fs.writeFileSync('firestore.rules', rules);
