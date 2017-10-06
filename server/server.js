const express = require('express');
const massive = require('massive');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');

const { secret } = require('./config').session;
const {dbUser, database, dbpass} = require('./config').db;
const { domain, clientID, clientSecret } = require('./config').auth0;


const connectionString = `postgres://${dbUser}:${dbpass}@localhost/${database}`


const port = 3000;
const app = express();

app.use(bodyParser.json());

app.use(cors());
app.use(express.static(`${__dirname}/../public`));



const massiveConnection = massive(connectionString)
.then(db => {
    app.set('db', db);
})
.catch(err => {
    console.log(err);
});

app.use(session({
    secret,
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new Auth0Strategy({
    domain,
    clientID,
    clientSecret,
    callbackURL:  '/auth/callback'
   }, (accessToken, refreshToken, extraParams, profile, done) => {
     //Find user in database
     console.log(profile.id);
     const db = app.get('db');
     // .then means this is a promise
     db.getUserByAuthId([profile.id]).then((user, err) => {
         console.log('INITIAL: ', user);
       if (!user[0]) { //if there isn't a user, we'll create one!
         console.log('CREATING USER');
         db.createUserByAuth([profile.displayName, profile.id]).then((user, err) => {
           console.log('USER CREATED', user[0]);
           return done(err, user[0]); // GOES TO SERIALIZE USER
         })
       } else { //when we find the user, return it
         console.log('FOUND USER', user[0]);
         return done(err, user[0]);
       }
     });
   }
 ));

 passport.serializeUser((user, done) => {
    done(null, user);
});

// pull user from session for manipulation
passport.deserializeUser((user, done) => {
    console.log(user);
    done(null, user);
});

const usersCtrl = require('./usersCtrl');



app.get('/api/users', usersCtrl.getUsers)


// auth endpoints

// initial endpoint to fire off login
app.get('/auth', passport.authenticate('auth0'));

// redirect to home and use the resolve to catch the user
app.get('/auth/callback',
    passport.authenticate('auth0', { successRedirect: '/', failureRedirect: 'login' }), (req, res) => {
        res.status(200).json(req.user);
});

// if not logged in, send error message and catch in resolve
// else send user
app.get('/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({err: 'User Not Authenticated'});
    res.status(200).json(req.user);
});

// remove user from session
app.get('/auth/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});



app.listen(port, () => {
    console.log(`Listening on port: ${port}`)
})