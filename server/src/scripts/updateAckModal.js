import fs from 'fs';

let c = fs.readFileSync('client/src/pages/complaints/AcknowledgeModal.jsx', 'utf8');
c = c.replace(/Sneha \(Quality Coordinator\)/g, 'Pooja (Quality Coordinator)');
c = c.replace(/sneha@naturalremedies\.com/g, 'pooja@naturalremedies.com');
fs.writeFileSync('client/src/pages/complaints/AcknowledgeModal.jsx', c, 'utf8');
console.log('Successfully updated AcknowledgeModal.jsx');

