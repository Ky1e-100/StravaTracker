const http = require('http');
const express = require('express');
const path = require('path');
const hbs = require('hbs');
const session = require('express-session')
const routes = require('./routes/index');

const PORT = process.env.PORT || 3000;
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.locals.pretty = true;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
    secret: 'BLACKPINK',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        sameSite: 'strict'
    }
}));


const checkAuth = function (req, res, next) {
    if (req.session.isAuthorized) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Apply middleware to all routes except /login and /loginAuth
app.use((req, res, next) => {
    if (req.path !== '/login' && req.path !== '/loginAuth' && req.path !== '/createAcc') {
        checkAuth(req, res, next);
    } else {
        next();
    }
});


app.get('/login', routes.login);
app.get('/', routes.home);
app.get('/home', routes.home)
app.get('/activities', routes.listActivities);
app.get('/allActivities', routes.allActivities);
app.get('/listUsers', routes.listUsers);
app.get('/challenges', routes.listChallenges);

app.post('/loginAuth', routes.authenticate2);
app.post('/createAcc', routes.createAccount);

app.listen(PORT, err => {
    if (err) {
        console.log(err);
    } else {
        console.log(`Server listening on port: ${PORT} CNTL:-C to stop`);
        console.log('http://localhost:3000/')
    }
})
