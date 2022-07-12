// import packages
const csvtojson = require('csvtojson');
const express = require('express');
const upload = require('express-fileupload');
// const ejs = require('ejs');
const { MongoClient } = require('mongodb');

// Name of MongoDB Service
const mongoService = "mongodb_install_base";

// Collect database settings from environment variables
const mongoHost = process.env.database_host;
const mongoPort = process.env.database_port;
const mongoDatabase = process.env.database_name;
const mongoUser = process.env.database_user;
const mongoPassword = process.env.database_password;
const mongoCollection = process.env.database_collection;

// Set variables
const filename = "inventory.csv";

// Build MongoDB connection string
//================================
// Used for OpenShift environment
var url = "mongodb://" + mongoUser + ":" + mongoPassword + "@" + mongoHost + ":" + mongoPort + "/" + mongoDatabase
// Used for local testing
// var url = "mongodb://localhost:27017/inventory";
console.log("MongoDB instance is at: " + url);

// Set Express.js to listen for all connections
const app = express();
const port = 8080;
const hostname = "0.0.0.0";

// Using the EJS renderer for pages
app.set('view engine', 'ejs');

// Use some other components
app.use(upload());
app.use(express.static('images'));

// Basic response on /
app.get('/', (req, res) => {
    res.send("ok");
});

// Healthcheck response
app.get('/healthz', (req, res) => {
    res.send("ok");
});

// Read the CSV file listed
app.get('/readcsv', (req, res) => {
    var dataArray = [];
    csvtojson().fromFile(filename).then(source => {
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
            console.log("connected to database");
            const collection = client.db(mongoDatabase).collection(mongoCollection);
            result = await collection.find().toArray();
        } finally {
            await client.close();
            console.log("connection to database closed");
        }
        console.log("returning result");
        // console.log(result);
        return result;
    }
    result = await findall().catch(console.dir);
    console.log('inventory read from database')
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
            result = await client.db(mongoDatabase).collection(mongoCollection).insertMany(jsonData);
            console.log(result.insertedCount + " entries inserted");
            console.log("insert completed");
        } finally {
            await client.close();
            console.log("client closed");
        }
        return result;
    }

    // Function to convert CSV file into JSON documents
    async function convert(csv) {
        var jsonData = await csvtojson().fromFile(csv);
        return jsonData;
    }

    // Logic to return the correct result
    jsonData = await convert(filename);
    output = await jsonImport(jsonData).catch(console.dir);
    // Return a nice JSON document to the caller
    res.send(JSON.parse('{"result": "success", "message": "' + output.insertedCount + ' entries imported", "importedEntries": ' + output.insertedCount + '}'));
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
            const collection = client.db(mongoDatabase).collection(mongoCollection);
            console.log("collection set");
            result = await collection.deleteMany();
            console.log(result.deletedCount + ' entries deleted');
        } finally {
            await client.close();
            console.log("client closed");
        }
        console.log('Deleted: all rows');
        return result;
    }

    // Logic to return the correct result
    output = await deleteall().catch(console.dir);
    res.send(JSON.parse('{"result": "success", "message": "' + output.deletedCount + ' entries deleted", "deletedEntries": ' + output.deletedCount + '}'));
})

// Save the file uploaded as uploadfile to filename
app.post("/upload", function(req, res) {
    console.log('Upload started');
    if(req.files) {
        if(Array.isArray(req.files.uploadfile)) {
            console.log('Array of files was uploaded');
            res.send('Please upload a single CSV file only');
        }
        else if (!req.files.uploadfile) {
            console.log('Files were uploaded but not as "file"');
            res.send('File not uploaded as "file"');
        }
        else if (!req.files || Object.keys(req.files).length === 0) {
            console.log('No files were uploaded');
            res.send('No files were uploaded');
        } else {
            req.files.uploadfile.mv(filename, function(err) {
                if (err)
                    console.log('Upload error: ' + err);
                    return res.status(500).send(err);
            });
            console.log('File uploaded to ' + filename + ' with size ' + req.files.uploadfile.size + ' bytes');
            res.send(JSON.parse('{"result":"success", "message": "File uploaded with size ' + req.files.uploadfile.size + ' bytes", "fileSize": ' + req.files.uploadfile.size + '}'));
        }
    } else {
        res.send('No files found in request');
    }
});

app.get("/uploadfile", function(req,res) {
    res.render('uploadfile');
});

// Deploy web server and log status
app.listen(port, hostname, () => {
    console.log(`MongoDB app listening at http://${hostname}:${port}`)
})
