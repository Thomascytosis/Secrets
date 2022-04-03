//jshint esversion:6 --- setup code
require("dotenv").config(); //environmental security always place at top
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session"); //required for passport
const passport = require("passport"); //use passport
const passportLocalMongoose = require("passport-local-mongoose"); //use passport
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate"); //to use googles findorcreate variable
//findorcreate require makiing the types folder and index.d.ts


const app = express();


app.use(session({
    secret: "ourLittleSecret",
    resave: false,
    saveUninitialized: false
}));
// keep passport code in this order
app.use(passport.initialize()); //initialize passport code
app.use(passport.session()); //start passport session

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));

//mongodb code
mongoose.connect("mongodb+srv://Thomascytosis:0mega2missioncontrol!@todocluster.xqqgv.mongodb.net/userDB?retryWrites=true&w=majority", {useNewUrlParser: true});
// add new mongoose.schema to use mongoose encrypt
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String, //google passport enabled
    secret: String, //store user submitted secrets in DB
});
//passport local mongoose uses mongoose Schema
userSchema.plugin(passportLocalMongoose); //modifies schema to use passport
userSchema.plugin(findOrCreate); //use findorcreate plugin

const User = new mongoose.model("User", userSchema);
//passport code
passport.use(User.createStrategy()); //building template for cookie

passport.serializeUser(function(user, done){
    done(null,user.id);
}); //Start Cookie
passport.deserializeUser(function(id,done){
    User.findById(id, function(err,user){
        done(err,user);
    });
}); //end cookie
//google passport
passport.use(new GoogleStrategy({
    clientID: "402162021852-sqprgub8htmkdlp0qjss1v8l941htmsj.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "https://obscure-hamlet-02554.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



//Url page code
app.get("/", function(req,res){
    res.render("home");
});
//google auth url code
app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"]})
);
 app.get("/auth/google/secrets",
    passport.authenticate("google", {failureRedirect: "/login"}),
    function(req,res){
        //successfull authentication, redirect to secrets
        res.redirect("/secrets");
    });

app.get("/login", function(req,res){
    res.render("login");
});
app.get("/register", function(req,res){
    res.render("register");
});
// secerts access with authentication
app.get("/secrets", function(req,res){
    //read DB to retrieve all users that have secrets submitted
    User.findById({"secret": {$ne: null}}, function(err, foundUsers){
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {userWithSecrets: foundUsers});
            }
        }
    });

    // authorization to see secrets is now remembers with cookies
    // if (req.isAuthenticated()){
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }
});
//check auth to submit new secret
app.get("/submit", function(req,res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});
//post secrets
app.post("/submit", function(req,res){
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});
// logout with passport
app.get("/logout", function(req,res){
    req.logout();
    res.redirect("/");
});


//web page submit register route code, save to DB, redirect to secrets page.
app.post("/register", function(req,res){
    User.register({username: req.body.username}, req.body.password, function(err,user){
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

});

//web page login route code, check db, redirect
app.post("/login", function(req,res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user,function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }
    });



});


//server code
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
// app.listen(port);

//local server
app.listen(port, function() {
  console.log("Server started on port 3000");
});