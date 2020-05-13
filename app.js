//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
//Creation of Session
app.use(session({
 secret: 'Our little secret',
 resave: false,
 saveUninitialized: false
}));
//passport Configuration
app.use(passport.initialize());
app.use(passport.session());




mongoose.connect(process.env.MONGO_ATLAS,
 { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true })
 .then(() => console.log('connected to DB'))
 .catch(err => console.log(err));
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
 email: String,
 password: String,
 googleId: String,
 //addsecret: [String]
 secret: String
});
//passportlocalmogoose configuration
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//mongoose model
//const Secret = new mongoose.model("Secret", userSchema);
const User = new mongoose.model("User", userSchema);

//passport.use(Secret.createStrategy());
passport.use(User.createStrategy());
//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());
//Suitable for different kinds of Authorization Stratgies
passport.serializeUser(function (user, done) {
 done(null, user.id);
});

passport.deserializeUser(function (id, done) {
 //Secret.findById(id, function (err, user) {
 User.findById(id, function (err, user) {
  done(err, user);
 });
});

passport.use(new GoogleStrategy({
 clientID: process.env.CLIENT_ID,
 clientSecret: process.env.CLIENT_SECRET,
 callbackURL: "http://localhost:3000/auth/google/secret",
 userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
 function (accessToken, refreshToken, profile, cb) {
  //Secret.findOrCreate({ googleId: profile.id }, function (err, user) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
   return cb(err, user);
  });
 }
));

app.get("/", function (req, res) {
 res.render("home");
});
app.get("/auth/google",
 passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/secret",
 passport.authenticate('google', { failureRedirect: "/login" }),
 function (req, res) {
  // Successful authentication, redirect home.
  res.redirect("/secrets");
 });

app.get("/login", function (req, res) {
 res.render("login");
});
app.get("/register", function (req, res) {
 res.render("register");
});
app.get("/secrets", function (req, res) {
 //Secret.find({ "addsecret": { $ne: null } }, function (err, foundUsers) {
 User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
  if (err) {
   console.log(err);
  } else {
   if (foundUsers) {
    res.render("secrets", { usersWithSecrets: foundUsers });
   }
  }
 });
});
app.get("/submit", function (req, res) {
 if (req.isAuthenticated()) {
  res.render("submit");
 } else {
  res.redirect("/login");
 }
});
app.post("/submit", function (req, res) {
 const submittedSecret = req.body.secret;
 //console.log(req.user.id);
 //Secret.findById(req.user.id, function (err, foundUser) {
 User.findById(req.user.id, function (err, foundUser) {
  if (err) {
   console.log(err);
  } else {
   if (foundUser) {
    foundUser.secret = submittedSecret;
    //foundUser.addsecret.push();
    foundUser.save(function () {
     res.redirect("/secrets")
    });
   }
  }
 });
});

app.get("/logout", function (req, res) {
 req.logout();
 res.redirect("/");
});
app.post("/register", function (req, res) {
 //Secret.register({ username: req.body.username }, req.body.password, function (err, user) {
 User.register({ username: req.body.username }, req.body.password, function (err, user) {
  if (err) {
   console.log(err);
   res.redirect("/register");
  } else {
   passport.authenticate("local")(req, res, function () {
    res.redirect("/secrets");
   });
  }
 });
});


app.post("/login", function (req, res) {
 //const secret = new Secret({
 const user = new User({
  username: req.body.username,
  password: req.body.password
 });
 req.login(user, function (err) {
  if (err) {
   console.log(err);
  } else {
   passport.authenticate("local")(req, res, function () {
    res.redirect("/secrets");
   });
  }
 });
});

app.listen(3000, function () {
 console.log("Server started on port 3000")
});
