const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const { resolve } = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI = 'mongodb+srv://admin-isaak:Bi0jgrmom9inuyZF@cluster0.y0hyp.mongodb.net/testDB?retryWrites=true&w=majority';

// mongoose.connect("mongodb+srv://admin-isaak:Bi0jgrmom9inuyZF@cluster0.y0hyp.mongodb.net/todolistDB?retryWrites=true&w=majority", {useNewUrlParser: true});

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, {useNewUrlParser: true, useUnifiedTopology: true});

// Init gfs
let gfs;

conn.once('open', function()
{
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    // name of collection
    gfs.collection('uploads');
});

// Create storage engine (object)
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });



// @route GET //
// @desc Loads form
app.get('/', (req, res) =>
{
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            res.render("index", {files: false});
        }

        else {
            files.map(file => {
                if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
                    file.isImage = true;
                }

                else{
                    file.isImage = false;
                }
            });
            res.render("index", {files: files});
        }
    });
});


// @route POST /upload
// @desc Uploads file to DB
app.post("/upload", upload.single('file'), (req, res) => {
    // res.json({file: req.file});
    res.redirect("/");
});


// @route GET /files
// @desc Display all files in JSON
app.get("/files", (req, res) =>
{
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: "No files exist"
            });
        }

        // Files exist
        return res.json(files);
    });
});


// @route GET /files/:filename
// @desc Display an image by filename
app.get("/files/:filename", (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "No file exists"
            });
        }

        // File exists
        return res.json(file);
    });
});


// @route GET /image/:filename
// @desc Display image by filename
app.get("/image/:filename", (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "No file exists"
            });
        }

        // Check to see if it is an image
        if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }

        else {
            res.status(404).json({
                err: "Not an image"
            });
        }
    });
});


let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function()
{
    console.log("Server started on port " + port);
});