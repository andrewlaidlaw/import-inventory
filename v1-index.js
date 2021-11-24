// import packages
const csvtojson = require('csvtojson');
const express = require('express');
const { MongoClient } = require('mongodb');

// Collect database settings from environment variables
const mongoHost = process.env.database_host;
const mongoPort = process.env.database_port;
const mongoDatabase = process.env.database_name;
const mongoUser = process.env.database_user;
const mongoPassword = process.env.database_password;

// Build MongoDB connection string
//================================
// Used for OpenShift environment
// var url = "mongodb://" + mongoUser + ":" + mongoPassword + "@" + mongoHost + ":" + mongoPort + "/" + mongoDatabase
// Used for local testing
var url = "mongodb://localhost:27017/inventory"
console.log("MongoDB instance is at: " + url)

// Set Express.js to listen for all connections
const app = express();
const port = 8080;
const hostname = "0.0.0.0";

// Basic response on /
app.get('/', (req, res) => {
    res.send("ok");
});

// Read the CSV file listed
app.get('/readcsv', (req, res) => {
    csv = "fujitsu-full-maint.csv";
    var dataArray = [];
    csvtojson().fromFile(csv).then(source => {
        res.send(source);
    })
})

// Get a full array of all inventory entries in JSON format
app.get('/inventory', async (req, res) => {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("connection created");
    async function findall() {
        var result = ""
        try {
            await client.connect();
            console.log("connected");
            const collection = client.db(mongoDatabase).collection("inventory");
            console.log("collection set");
            result = await collection.find().toArray();
        } finally {
            await client.close();
            console.log("client closed");
        }
        console.log("returning result:");
        console.log(result);
        return result;
    }
    result = await findall().catch(console.dir);
    res.send(result);
})

// Read the inventory information from the CSV file and insert into MongoDB
app.get('/importinventory', async (req, res) => {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("connection created");

    // Function to insert JSON documents into MongoDB
    async function jsonImport(jsonData) {
        result = "";
        try {
            await client.connect();
            console.log("connected");
            result = await client.db(mongoDatabase).collection("inventory").insertMany(jsonData);
            console.log(result.insertedCount + "entries inserted");
            console.log("insert completed");
        } finally {
            await client.close();
            console.log("client closed");
        }
        console.log("done");
        return result;
    }

    // Funstion to convert CSV file into JSON documents
    async function convert(csv) {
        var jsonData = await csvtojson().fromFile(csv);
        return jsonData;
    }

    // Logic to return the correct result
    csv = "fujitsu-full-maint.csv";
    jsonData = await convert(csv);
    output = await jsonImport(jsonData).catch(console.dir);
    // Return a nice JSON document to the caller
    res.send(JSON.parse('{"result": "success", "importedEntries" : ' + output.insertedCount + '}'));
})

// Dekete all inventory information from the MongoDB database
app.get('/deleteall', async (req, res) => {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("connection created");

    // Function to delete all entries from the database
    async function deleteall() {
        result = "";
        try {
            await client.connect();
            console.log("connected");
            const collection = client.db(mongoDatabase).collection("inventory");
            console.log("collection set");
            result = await collection.deleteMany();
            console.log(result.deletedCount + " entries deleted");
        } finally {
            await client.close();
            console.log("client closed");
        }
        console.log('Deleted: all rows');
        return result;
    }

    // Logic to return the correct result
    output = await deleteall().catch(console.dir);
    res.send(JSON.parse('{"result": "success", "message": "All entries deleted"}'));
})

// Deploy web server and log status
app.listen(port, hostname, () => {
    console.log(`MongoDB app listening at http://${hostname}:${port}`)
})