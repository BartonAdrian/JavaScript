if (process.env.NODE_ENV !== "production")
    require('dotenv').config();

//Variables
const express = require('express');
const path = require('path');
const bodyparser = require("body-parser");
const session = require('express-session');
const { v4: uuidv4 } = require("uuid");
const methodOverride = require("method-override");
const mongoose = require('mongoose');
const router = require('./routes/router');
const cookieParser = require("cookie-parser");
const app = express();

//Port
const port = process.env.PORT || 3000;

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(methodOverride('_method'))
app.use(cookieParser());

//Session
app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true
}))

//Set view engine - ejs
app.set('view engine', 'ejs');

//Login route
app.get('/', (req, res) => {
    res.render('base', { title: "Login system" })
})

//Main route
app.use('/route', router);

//load static assets
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

//------------Database Connect-------------
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true
})
const db = mongoose.connection;
db.on("error", error => console.error(error));
db.once("open", () => console.log("Connected to Mongoose"));
//-----------------------------------------


//---------Listen-----------
app.listen(port, () => { console.log("Listening to the server on http://localhost:3000") });
//--------------------------