const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables
const db = require('./db');
require('./events/logger'); // Initialize event logger

mongoose.set('strictQuery', true);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to use rl.question with async/await
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function menu() {
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

  const ans = await ask('Choose option: ');

  switch (ans.trim()) {
    case '1': {
      const name = await ask('Enter name: ');
      const value = await ask('Enter value: ');
      await db.addRecord({ name, value });
      console.log('Record added successfully!');
      break;
    }

    case '2': {
      const records = await db.listRecords();
      if (records.length === 0) console.log('No records found.');
      else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
      break;
    }

    case '3': {
      const id = await ask('Enter record ID to update: ');
      const name = await ask('New name: ');
      const value = await ask('New value: ');
      const updated = await db.updateRecord(Number(id), name, value);
      console.log(updated ? 'Record updated!' : 'Record not found.');
      break;
    }

    case '4': {
      const id = await ask('Enter record ID to delete: ');
      const deleted = await db.deleteRecord(Number(id));
      console.log(deleted ? 'Record deleted!' : 'Record not found.');
      break;
    }

    case '5': {
      const keyword = await ask('Enter keyword to search: ');
      const results = await db.searchRecords(keyword);
      if (results.length === 0) console.log('No matching records found.');
      else results.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
      break;
    }

    case '6': {
      const by = await ask('Sort by (id, name, value): ');
      const sorted = await db.sortRecords(by);
      if (sorted.length === 0) console.log('No records to sort.');
      else sorted.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
      break;
    }

    case '7': {
      const fileName = await db.exportRecords();
      console.log(`Data exported to file: ${fileName}`);
      break;
    }

    case '8':
      console.log('Exiting NodeVault...');
      rl.close();
      await mongoose.disconnect(); // Disconnect from MongoDB
      return;

    default:
      console.log('Invalid option.');
  }

  // Show menu again
  menu();
}

menu();
