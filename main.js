const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables
const db = require('./db');
require('./events/logger'); // Initialize event logger

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function menu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Search Records
6. Sort Records
7. Export Records
8. Exit
=====================
  `);

  rl.question('Choose option: ', ans => {
    switch (ans.trim()) {
      case '1':
        rl.question('Enter name: ', name => {
          rl.question('Enter value: ', value => {
            db.addRecord({ name, value });
            console.log('✅ Record added successfully!');
            menu();
          });
        });
        break;

      case '2':
        const records = db.listRecords();
        if (records.length === 0) console.log('No records found.');
        else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
        menu();
        break;

      case '3':
        rl.question('Enter record ID to update: ', id => {
          rl.question('New name: ', name => {
            rl.question('New value: ', value => {
              const updated = db.updateRecord(Number(id), name, value);
              console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
              menu();
            });
          });
        });
        break;

      case '4':
        rl.question('Enter record ID to delete: ', id => {
          const deleted = db.deleteRecord(Number(id));
          console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
          menu();
        });
        break;

      case '5':
        rl.question('Enter keyword to search: ', keyword => {
          const results = db.searchRecords(keyword);
          if (results.length === 0) console.log('No matching records found.');
          else results.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
          menu();
        });
        break;

      case '6':
        rl.question('Sort by (id, name, value): ', by => {
          const sorted = db.sortRecords(by);
          if (sorted.length === 0) console.log('No records to sort.');
          else sorted.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
          menu();
        });
        break;

      case '7':
        const fileName = db.exportRecords();
        console.log(`✅ Data exported to file: ${fileName}`);
        menu();
        break;

      case '8':
        console.log('👋 Exiting NodeVault...');
        rl.close();
        mongoose.disconnect(); // Disconnect from MongoDB
        break;

      default:
        console.log('Invalid option.');
        menu();
    }
  });
}

menu();

