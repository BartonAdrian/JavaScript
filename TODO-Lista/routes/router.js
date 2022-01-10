var express = require('express');
var router = express.Router();
const User = require('../models/user');
const Task = require('../models/task');
const { ObjectId } = require('mongodb');
const bcrypt = require("bcrypt");
var http = require('http');


//route for logging
router.post('/login', async(req, res) => {
    const users = await User.find({});
    let logged = false;
    for (let i = 0; i < users.length; i++) {
        var usr = users[i];
        if (usr.email == req.body.email && await bcrypt.compare(req.body.password, usr.password)) {
            res.cookie('user', usr)
            res.redirect('/route/dashboard');
            logged = true;
        }
    }
    if (!logged)
        res.render('base', { title: "Express", logout: "Wrong password or email!" })
})

//route for register
router.get('/register', (req, res) => {
    res.render('register');
})

router.get('/json', async(req, res) => {
    if (req.cookies.user) {
        const tasks = await Task.find({ userId: ObjectId(req.cookies.user._id) });
        res.render('json', { tasks: tasks, user: req.cookies.user.name });
    } else
        res.redirect("/");
})

//route for register
router.get('/backToLogin', (req, res) => {
    res.redirect("/")
})

//route for back to login from registration
router.post('/createUser', async(req, res) => {
    const users = await User.find({ email: req.body.email })
    const user = new User({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password[0]
    });
    if (req.body.password[0] == req.body.password[1] && !users.length) {
        try {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
            const newUser = await user.save();
        } catch {
            console.log("I was unable to register the user!")
        }
        res.render('base', { title: "Express", logout: "Successfully registered." })
    } else
        res.render('base', { title: "Express", logout: "This email is already registered!" })
})

//route for dashboard
router.get('/dashboard', async(req, res) => {
    if (req.cookies.user) {
        const tasks = await Task.find({ userId: ObjectId(req.cookies.user._id) });
        if (req.cookies.user.name) {
            res.render('dashboard', { tasks: tasks, user: req.cookies.user.name });
        } else {
            res.render('base');
        }
    } else
        res.redirect("/");
})

//route for log out
router.get('/logout', (req, res) => {
    res.cookie('user', null)
    req.session.destroy(function(err) {
        if (err) {
            console.log(err);
        } else {
            res.render('base', { title: "Express", logout: "logout successfully." })
        }
    });
})

//-------------Task manager-------------
//route for add task
router.get('/add', async(req, res) => {
    if (req.cookies.user) {
        const task = new Task({
            userId: req.cookies.user._id,
            heading: req.query.text,
            state: "uncompleted"
        });
        try {
            const newTask = await task.save();
        } catch {
            console.log("I couldn't create the task!")
        }
        res.redirect('/route/dashboard');
    } else
        res.redirect("/");
})

router.get('/addFromJson', async(req, res) => {
    const task = new Task({
        userId: req.cookies.user._id,
        heading: req.query.text,
        state: "uncompleted"
    });
    try {
        const newTask = await task.save();
    } catch {
        console.log("I couldn't create the task!")
    }
    res.redirect('/route/json');
})


//route for make task completed
router.get('/:id/done', async(req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        task.state = "completed";
        await task.save();
    } catch {
        console.log("I couldn't complete the task!")
    }
    res.redirect('/route/dashboard');
});

//route for edit task
router.get('/:task/edit', async(req, res) => {
    var data = req.params.task.split("|");
    try {
        let task = await Task.findById(data[0]);
        task.heading = data[1].trim();
        await task.save();
    } catch {
        console.log("I couldn't save the task!")
    }
    res.redirect('/route/dashboard');
});

//route for delete task
router.delete('/:id', async(req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        await task.remove();
    } catch {
        console.log("I couldn't delete the task!")
    }
    res.redirect('/route/dashboard');
});
//--------------------------------------
router.get('*', (req, res) => {
    res.redirect("/");
});
//--------------Route not fournd--------------

//--------------------------------------------

//---------Export-----------
module.exports = router;
//--------------------------