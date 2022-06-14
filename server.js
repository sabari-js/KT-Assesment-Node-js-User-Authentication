const express = require('express');
const app = express()
const { pool } = require("./dbConfig");
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');

const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 4000;

app.set('view engine','ejs')
app.use(express.urlencoded({extended: false}));

app.use(
    session({
        secret: 'secret',

        resave: false,

        saveUninitialized: false
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/user/register", (req, res) => {
    res.render("register");
});

app.get("/user/login", (req, res) => {
    res.render("login");
});

app.get("/user/edit/:id", (req, res) => {

    const id = req.params.id;

    pool.query(`SELECT * FROM users WHERE id=${id}`, (err,results) => {
        if(err) {
            throw err;
        }
        res.render("edit", {data : results.rows});
    })
});

app.post("/update", (req, res) => {

    
    var name = req.body.name;
    var email= req.body.email;
    const id = req.body.id;
    
    pool.query(`UPDATE users SET name=$1, email=$2 WHERE id=$3`,[name, email, id], (err, results) => {
        if(err) {
            console.log(err);
        }
        
        
        res.redirect("/user/dashboard");

    })
});



app.get("/user/dashboard", (req, res) => {
    
 
    pool.query(`SELECT * FROM users`,(err, results)=>{
        if(err) {
            throw err;
        }
        res.render("dashboard", {data : results.rows});

    })
    

});

app.get("/user/delete/:id", (req, res) => {

    const id = req.params.id;

    pool.query(`DELETE  FROM users WHERE id=${id}`, (err,results) => {
        if(err) {
            throw err;
        }
        
        res.redirect("/user/dashboard");
    })
});





app.get("/user/logout",(req,res) => {
    req.logOut();
    req.flash("success_msg","you have logged out");
    res.redirect("/user/login");
})

app.post('/user/register', async(req,res) => {
    let {name, email, password, password2}= req.body;

    console.log({
        name,
        email,
        password,
        password2
    });

    let errors = [];

    if (!name || !email || !password || !password2 ){
        errors.push({message: "please enter all fields"});
    }

    if(password.length < 6) {
        errors.push({message: "password should be in 6 charcters"});

    }

    if(password != password2) {
        errors.push({message: "password does not match"});
    }

    if(errors.length > 0) {
        res.render('register',{errors});
    } else {
        // form validation has passed

        let hashedpassword = await bcrypt.hash(password, 10);
        console.log(hashedpassword)

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`,
            [email],
            (err, results) => {
                if(err){
                    throw err;
                }

                console.log(results.rows);

                if(results.rows.length > 0){
                    errors.push({ message : "email already exist"});
                    res.render("register", {errors});
                } else {
                    pool.query(
                        `INSERT INTO users (name, email, password)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`, 
                        [name, email, hashedpassword], 
                        (err, results) => {
                            if (err) {
                                throw err;
                            }
                            console.log(results.row);
                            req.flash("success_msg","You are new registered. Please log in");
                            res.redirect("/user/login");

                        }
                    );
                }
            }
            );
    }

});

app.post(
    "/user/login", 
    passport.authenticate('local',{
        successRedirect: "/user/dashboard",
        failureRedirect: "/user/login",
        failureFlash: true
    })
);



app.listen(PORT, ()=> {
    console.log(`server running on port ${PORT}`);
});

