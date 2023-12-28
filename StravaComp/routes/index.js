const url = require('url');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/allData');
const fs = require('fs');

const ROOT_DIR = 'views';

exports.authenticate2 = function (request, response, next) {
    let username = request.body.username;
    let password = request.body.password;

    console.log(username + " " + password);

    // Check the database for user authentication
    let authorized = false;

    db.all("SELECT userid, password, role, token FROM users", function (err, rows) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].userid === username && rows[i].password === password) {
                request.session.userid = username;
                request.session.isAuthorized = true;
                request.session.userRole = rows[i].role;
                request.session.token = rows[i].token;
                console.log(request.session.token);

            }
        }

        // Send response to the client
        if (request.session.isAuthorized) {
            // isAuthorized = true;
            // response.redirect(302, '/home');
            response.render('homepage', {
                userid: `${request.session.userid}`
            })

            // reAuthorize();
        } else {
            response.status(401).json({ success: false, message: "Authentication failed" });
        }
    });
};

exports.login = function (request, response) {
    if (request.session.isAuthorized) {
        response.redirect('/home'); // Redirect authenticated users to home
    } else {
        response.render('loginpage');
    }
};

exports.createAccount = function (request, response) {
    let username = request.body.username;
    let password = request.body.password;
    let token = request.body.token;
    let refreshToken;

    console.log(`${username} ${password} ${token}`);

    fetch(auth_link, {
        method: 'post',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            client_id: '117373',
            client_secret: 'd2e8e03fee2f6a72a13d62c1c4a0fcd600101412',
            code: `${token}`,
            grant_type: 'authorization_code'
        })
    }).then(res => res.json())
        .then(res => {
            console.log(res);
            refreshToken = res.refresh_token;
            let sql = `insert into users values ('${username}', '${password}', 'guest', '${refreshToken}');`
            db.run(sql);
            console.log(sql);
            response.redirect('/login');

        })



};

exports.home = function (request, response) {
    response.render('homepage', {
        userid: `${request.session.userid}`
    })

    reAuthorize(request);
};

const auth_link = "https://www.strava.com/oauth/token";
let allActivities;



exports.listActivities = function (request, response) {
    reAuthorize(request);
    let sql = `Select name, userid, distance, elevation, avgSpeed, avgWatts, cal from activities where userid = '${request.session.userid}';`;
    db.all(sql, function (err, rows) {
        response.render('listActivities', {
            infoText: `Your Recent Activities`,
            activities: rows
        })
    })
}

exports.allActivities = function (request, response) {
    reAuthorize(request);
    let sql = `Select name, userid, distance, elevation, avgSpeed, avgWatts, cal from activities;`;
    db.all(sql, function (err, rows) {
        response.render('listActivities', {
            infoText: `Everyone's Recent Activities`,
            activities: rows
        })
    })
}

exports.listUsers = function (request, response) {
    if (request.session.userRole !== 'admin') {
        response.render('index', {
            title: 'ERROR!!!',
            body: 'You need to be an admin to access this page!'
        });
    } else {
        let sql = 'Select * from users;'
        db.all(sql, function (err, rows) {
            response.render('listUsers', {
                title: 'All users in the database',
                users: rows
            });
        })
    }
};

exports.listChallenges = async function (request, response) {
    try {
        const totalCalories = await getTotalCalories(request);
        const totalDistance = await getTotalDistance(request);
        const totalElevation = await getTotalElevation(request);

        console.log(`Total Calories: ${totalCalories}, Total Distance: ${totalDistance}, Total Elevation: ${totalElevation}`);

        let sql = 'SELECT * FROM challenges;';
        db.all(sql, function (err, rows) {
            if (err) {
                console.error('Error in fetching challenges:', err);
                response.status(500).send('Internal Server Error');
                return;
            }

            const challenges = rows.map(challenge => ({
                ...challenge,
                userCalories: totalCalories,
                userDistance: totalDistance.toFixed(2),
                userElevation: totalElevation
            }));

            response.render('listChallenges', {
                title: 'Active Challenges',
                challenges: challenges
            });
        });

    } catch (error) {
        console.error('Error:', error);
        response.status(500).send('Internal Server Error');
    }
};



function reAuthorize(request) {
    fetch(auth_link, {
        method: 'post',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            client_id: '117373',
            client_secret: 'd2e8e03fee2f6a72a13d62c1c4a0fcd600101412',
            refresh_token: `${request.session.token}`,
            grant_type: 'refresh_token'
        })
    }).then(res => res.json())
        .then(res => getActivities(res, request))
}

function getActivities(res, request) {
    let activities_link = `https://www.strava.com/api/v3/athlete/activities?access_token=${res.access_token}`;
    fetch(activities_link)
        .then(res => res.json())
        .then(data => {
            allActivities = data;
            for (let activity of allActivities) {
                const cleanedName = activity.name.replace(/['"]/g, '');
                console.log(activity.name);
                let sql = `insert into activities values ('${activity.id}', '${request.session.userid}', '${activity.start_date_local}', ${activity.kilojoules}, ${(activity.average_speed * 3.6).toFixed(2)}, ${activity.average_watts}, ${(activity.distance / 1000).toFixed(2)}, ${activity.total_elevation_gain}, '${cleanedName}');`;
                db.run(sql, function (err) {
                    if (err) {
                        return console.error(`Error inserting activity '${activity.name}': ${err.message}`);
                    }
                    console.log(`Activity '${activity.name}' inserted into the database.`);
                });
            }
        })
        .catch(error => console.error('Error:', error));
}

// Function to get the total calories for a user
function getTotalCalories(request) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT SUM(cal) AS totalCalories FROM activities WHERE userid = '${request.session.userid}';`;
        db.get(sql, function (err, row) {
            if (err) {
                reject(err);
            } else {
                const totalCalories = row ? row.totalCalories || 0 : 0;
                resolve(totalCalories);
            }
        });
    });
}

// Function to get the total distance for a user
function getTotalDistance(request) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT SUM(distance) AS totalDistance FROM activities WHERE userid = '${request.session.userid}';`;
        db.get(sql, function (err, row) {
            if (err) {
                reject(err);
            } else {
                const totalDistance = row ? row.totalDistance || 0 : 0;
                resolve(totalDistance);
            }
        });
    });
}

// Function to get the total elevation for a user
function getTotalElevation(request) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT SUM(elevation) AS totalElevation FROM activities WHERE userid = '${request.session.userid}';`;
        db.get(sql, function (err, row) {
            if (err) {
                reject(err);
            } else {
                const totalElevation = row ? row.totalElevation || 0 : 0;
                resolve(totalElevation);
            }
        });
    });
}

