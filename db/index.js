require("dotenv").config();
const { MongoClient } = require("mongodb");
const fileDB = require('./file');
const recordUtils = require('./record');
const vaultEvents = require('../events');
const fs = require("fs");
const path = require("path");

const uri = process.env.MONGO_URI;
const dbName = "UsersData";
const collectionName = "Users";

let db, collection;

async function connectDB() {
  if (db) return;

  const client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);
  collection = db.collection(collectionName);

  console.log("Connected");
}

//
// ✅ CREATE BACKUP
//
async function createBackup() {
  await connectDB();

  const data = await collection.find().toArray();

  const backupDir = path.join(__dirname, "../backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const dateTime = now.toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0];
  const filename = `backup_${dateTime}.json`;
  const filePath = path.join(backupDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`✅ Backup successfully created: ${filename}`);
}

//
// ADD RECORD
//
async function addRecord({ name, value }) {
  await connectDB();

  recordUtils.validateRecord({ name, value });

  const newRecord = {
    id: recordUtils.generateId(),
    name,
    value
  };

  await collection.insertOne(newRecord);
  vaultEvents.emit("recordAdded", newRecord);

  await createBackup();   // ✅ AUTO BACKUP AFTER ADD

  return newRecord;
}

//
// LIST ALL RECORDS
//
async function listRecords() {
  await connectDB();
  return collection.find().toArray();
}

//
// SEARCH RECORDS
//
async function searchRecords(keyword) {
  await connectDB();

  const key = keyword.toLowerCase();

  return collection.find({
    $or: [
      { name: { $regex: key, $options: "i" } },
      { value: { $regex: key, $options: "i" } }
    ]
  }).toArray();
}

//
// SORT RECORDS
//
async function sortRecords(by = "id") {
  await connectDB();

  let sortField = {};
  sortField[by] = 1;

  return collection.find().sort(sortField).toArray();
}

//
// UPDATE RECORD
//
async function updateRecord(id, newName, newValue) {
  await connectDB();

  const updated = await collection.findOneAndUpdate(
    { id },
    { $set: { name: newName, value: newValue } },
    { returnDocument: "after" }
  );

  if (!updated.value) return null;

  vaultEvents.emit("recordUpdated", updated.value);
  return updated.value;
}

//
// DELETE RECORD
//
async function deleteRecord(id) {
  await connectDB();

  const record = await collection.findOne({ id });
  if (!record) return null;

  await collection.deleteOne({ id });

  vaultEvents.emit("recordDeleted", record);

  await createBackup();

  return record;
}

//
// EXPORT TO TEXT FILE
//
async function exportRecords(filename = "vault-export.txt") {
  await connectDB();

  const data = await collection.find().toArray();
  const text = data
    .map(r => `ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`)
    .join("\n");

  fs.writeFileSync(filename, text);
  return filename;
}

//
//  VIEW VAULT STATISTICS
//
async function viewStatistics() {
  await connectDB();

  const records = await collection.find().toArray();
  const totalRecords = records.length;

  if (totalRecords === 0) {
    console.log("\n📊 Vault Statistics");
    console.log("------------------");
    console.log("Total Records: 0");
    console.log("No further statistics available.\n");
    return;
  }

  //  Longest Name
  let longestName = records[0].name;
  for (let r of records) {
    if (r.name.length > longestName.length) {
      longestName = r.name;
    }
  }

  //  Earliest & Latest Record Using MongoDB _id Timestamp
  const sortedByDate = [...records].sort(
    (a, b) => a._id.getTimestamp() - b._id.getTimestamp()
  );

  const earliestDate = sortedByDate[0]._id.getTimestamp();
  const latestDate = sortedByDate[sortedByDate.length - 1]._id.getTimestamp();

  //  Most Recent Modification (From Backup Files)
  const backupDir = path.join(__dirname, "../backups");
  let latestModification = "No backup found";

  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    if (files.length > 0) {
      let latestFile = files[0];
      let latestTime = fs.statSync(path.join(backupDir, latestFile)).mtime;

      for (let f of files) {
        const fileTime = fs.statSync(path.join(backupDir, f)).mtime;
        if (fileTime > latestTime) {
          latestTime = fileTime;
          latestFile = f;
        }
      }

      latestModification = latestTime.toLocaleString();
    }
  }

  console.log("Vault Statistics");
  console.log("------------------");
  console.log(`Total Records: ${totalRecords}`);
  console.log(`Most Recent Modification: ${latestModification}`);
  console.log(`Longest Name: ${longestName} (${longestName.length} characters)`);
  console.log(`Earliest Record Date: ${earliestDate.toLocaleString()}`);
  console.log(`Latest Record Date: ${latestDate.toLocaleString()}\n`);
}




module.exports = {
  addRecord,
  listRecords,
  searchRecords,
  sortRecords,
  updateRecord,
  deleteRecord,
  exportRecords,
  viewStatistics
};

