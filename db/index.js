require("dotenv").config();
const { MongoClient } = require("mongodb");
const fileDB = require('./file');   // keep old file functions (optional)
const recordUtils = require('./record');
const vaultEvents = require('../events');
const fs = require("fs");

const uri = process.env.MONGO_URI;
const dbName = "UsersData";
const collectionName="Users";

let db, collection;

async function connectDB() {
  if (db) return; // already connected

  const client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);
  collection = db.collection(collectionName);

  console.log("✅ Connected to MongoDB Atlas");
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

module.exports = {
  addRecord,
  listRecords,
  searchRecords,
  sortRecords,
  updateRecord,
  deleteRecord,
  exportRecords
};

