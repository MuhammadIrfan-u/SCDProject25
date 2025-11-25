const fileDB = require('./file');
const recordUtils = require('./record');
const vaultEvents = require('../events');

function addRecord({ name, value }) {
  recordUtils.validateRecord({ name, value });
  const data = fileDB.readDB();
  const newRecord = { id: recordUtils.generateId(), name, value };
  data.push(newRecord);
  fileDB.writeDB(data);
  vaultEvents.emit('recordAdded', newRecord);
  return newRecord;
}

function listRecords() {
  return fileDB.readDB();
}

function searchRecords(keyword) {
  const data = fileDB.readDB();
  const key = keyword.toLowerCase();

  return data.filter(
    r =>
      r.name.toLowerCase().includes(key) ||
      r.value.toLowerCase().includes(key)
  );
}


function sortRecords(by = "id") {
  const data = fileDB.readDB();

  if (by === "id") {
    return data.sort((a, b) => a.id - b.id);
  }

  if (by === "name") {
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (by === "value") {
    return data.sort((a, b) => a.value.localeCompare(b.value));
  }

  return data;
}

function updateRecord(id, newName, newValue) {
  const data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  record.name = newName;
  record.value = newValue;
  fileDB.writeDB(data);
  vaultEvents.emit('recordUpdated', record);
  return record;
}

function deleteRecord(id) {
  let data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  data = data.filter(r => r.id !== id);
  fileDB.writeDB(data);
  vaultEvents.emit('recordDeleted', record);
  return record;
}

module.exports = { 
  addRecord, 
  listRecords, 
  searchRecords, 
  sortRecords,
  updateRecord, 
  deleteRecord 
};
