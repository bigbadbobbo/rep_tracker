if(process.env.NODE_ENV !== "production") {
  require('dotenv').config()
}

const express = require("express")
const app = express()
const bcrypt = require("bcrypt")
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const { Client } = require('pg')

let user

let routines

let schedule

//const connectionString = 'postgres://postgres@localhost:5432/database'

const client = new Client({
  host: 'localhost',
//  user: 'bobbo',
  user: 'postgres',
  port: 5432,
  database: 'rep',
//  password: 'ThisIsARandomPassword'
  password: '11818Baby'
})

client.connect()

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  async function email(email) {
    const text = 'SELECT * FROM account WHERE email = $1'
    const value = [email]
    try {
      const res = await client.query(text, value)
      user = res.rows[0]
      return res.rows[0]
    }
    catch(e) {
        console.error(e.stack)
        return null
      }
  },
  async function id(id) {
    const text = 'SELECT * FROM account WHERE id = $1'
    const value = [id]
    try {
      const res = await client.query(text, value)
      user = res.rows[0]
      return res.rows[0]
    }
    catch(e) {
        console.error(e.stack)
        return null
    }
  }
)


// TEMPORARY VARABLE SUBSTITUTE FOR DATABASE
//const users = []

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(express.static(__dirname + '/public'))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/routine', checkAuthenticated, async (req, res) => {
  const query = "SELECT * FROM routine WHERE id = $1"
  const value = [req.query.id]
  client
  .query(query, value)
  .then( response => {
    routine = response.rows[0]
    const query2 = "SELECT * FROM sets FULL OUTER JOIN exercise ON sets.exercise = exercise.id FULL OUTER JOIN comprises ON sets.id = comprises.sets WHERE sets.id IN (SELECT sets FROM comprises WHERE routine = $1) ORDER BY ordering ASC"
    client
    .query(query2, value)
    .then( setss => {
      sets = setss.rows
      res.render('./routine.ejs', { user: user, routine: routine, sets: sets })
    })
    .catch(e => {
      console.error(e.stack)
      res.redirect('/search')
    })
  })
  .catch(e => {
    console.error(e.stack)
    res.redirect('/search')
  })
})

app.get('/myroutine', checkAuthenticated, async (req, res) => {
  const query = "SELECT * FROM routine WHERE id = $1"
  const value = [req.query.id]
  client
  .query(query, value)
  .then( response => {
    routine = response.rows[0]
    const query2 = "SELECT * FROM sets FULL OUTER JOIN exercise ON sets.exercise = exercise.id FULL OUTER JOIN comprises ON sets.id = comprises.sets WHERE sets.id IN (SELECT sets FROM comprises WHERE routine = $1) ORDER BY ordering ASC"
    client
    .query(query2, value)
    .then( setss => {
      sets = setss.rows
      res.render('./myroutine.ejs', { user: user, routine: routine, sets: sets })
    })
    .catch(e => {
      console.error(e.stack)
      res.redirect('/')
    })
  })
  .catch(e => {
    console.error(e.stack)
    res.redirect('/')
  })
})

app.get('/launchroutine', checkAuthenticated, async (req, res) => {
  const query = "SELECT name FROM routine WHERE id = $1"
  const value = [req.query.id]
  client
  .query(query, value)
  .then( response => {
    routine = response.rows[0].name
    const rightnow = new Date().getTime()
    const value2 = [routine, user.id, rightnow]
    const query2 = "INSERT INTO completed (name, account, happened) VALUES ($1, $2, $3) returning id"
    client
    .query(query2, value2)
    .then( complete => {
      /*const query7 = "SELECT id FROM completed WHERE name = $1 AND account = $2 AND happened = $3 ORDER BY happened DESC"
      /*client
      .query(query7, value2)
      .then( complete => {*/
        const completed = complete.rows[0]
        const queryT = "SELECT * FROM sets FULL OUTER JOIN exercise ON sets.exercise = exercise.id FULL OUTER JOIN comprises ON sets.id = comprises.sets WHERE sets.id IN (SELECT sets FROM comprises WHERE routine = $1) ORDER BY ordering ASC"
        client
        .query(queryT, value)
        .then( setss => {
          sets = setss.rows
          res.render('./launchroutine.ejs', { user: user, routine: routine, sets: sets, completed: completed })
        })
        .catch(e => {
          console.error(e.stack)
          res.redirect('/')
        })
      /*})
      .catch(e => {
        console.error(e.stack)
        res.redirect('/')
      })*/
    })
    .catch(e => {
      console.error(e.stack)
      res.redirect('/')
    })
  })
  .catch(e => {
    console.error(e.stack)
    res.redirect('/')
  })
})

app.get('/editroutine', checkAuthenticated, async (req, res) => {
  const query = "SELECT * FROM routine WHERE id = $1"
  const value = [req.query.id]
  client
  .query(query, value)
  .then( response => {
    routine = response.rows[0]
    const query2 = "SELECT * FROM sets FULL OUTER JOIN exercise ON sets.exercise = exercise.id FULL OUTER JOIN comprises ON sets.id = comprises.sets WHERE sets.id IN (SELECT sets FROM comprises WHERE routine = $1) ORDER BY ordering ASC"
    client
    .query(query2, value)
    .then( setss => {
      sets = setss.rows
      const query3 = "SELECT * FROM exercise ORDER BY name ASC"
      client
        .query(query3)
        .then( response3 => {
          exercises = response3.rows
          res.render('./editroutine.ejs', { user: user, routine: routine, sets: sets, exercises: exercises })
        })
        .catch(e => {
          console.error(e.stack)
          res.redirect('/')
        })
    })
    .catch(e => {
      console.error(e.stack)
      res.redirect('/')
    })
  })
  .catch(e => {
    console.error(e.stack)
    res.redirect('/')
  })
})

app.get('/prepschedule', checkAuthenticated, async (req, res) => {
  const text2 = 'SELECT id, name FROM routine WHERE id IN (SELECT routine FROM myroutines WHERE account = $1)'
  const value2 = [user.id]
  client
  .query(text2, value2)
  .then(routine => {
    routines = routine.rows
    const text = 'SELECT * FROM queue FULL OUTER JOIN routine ON queue.routine = routine.id WHERE queue.account = $1 ORDER BY queue.ordering ASC'
    client
    .query(text, value2)
    .then(sche => {
      schedule = sche.rows
  //    console.log(schedule);
      res.redirect('/schedule')
    })
    .catch(e => {
      console.error(e.stack)
      res.redirect('/')
    })

  })
  .catch(e => {
    console.error(e.stack)
    res.redirect('/')
  })
})

app.get('/prepmyroutines', checkAuthenticated, async (req, res) => {
  const text2 = 'SELECT id, name FROM routine WHERE id IN (SELECT routine FROM myroutines WHERE account = $1)'
  const value2 = [user.id]
  client
  .query(text2, value2)
  .then(routine => {
    routines = routine.rows
    res.redirect('/myroutines')
  })
  .catch(e => {
    console.error(e.stack)
    res.redirect('/')
  })
})

app.get('/addtomyroutines', checkAuthenticated, async (req, res) => {
  const query = 'INSERT INTO myroutines (routine, account) VALUES ($1, $2)'
  const value = [req.query.id, user.id]
  client
  .query(query, value)
  .then( response => {
    const text2 = 'SELECT id, name FROM routine WHERE id IN (SELECT routine FROM myroutines WHERE account = $1)'
    const value2 = [user.id]
    client
    .query(text2, value2)
    .then(routine => {
      routines = routine.rows
      res.redirect('/myroutines')
    })
    .catch(e => {
      console.error(e.stack)
      res.redirect('/')
    })
  })
  .catch(e => {
    console.error(e.stack)
    res.redirect('/')
  })
})

app.get("/create", checkAuthenticated, async (req, res) => {
    const query = "SELECT * FROM exercise ORDER BY name ASC"
    client
      .query(query)
      .then( response => {
        exercises = response.rows
        res.render('./create.ejs', { user: user, exercises: exercises })
      })
      .catch(e => {
        console.error(e.stack)
        res.redirect('/')
      })
})

app.get("/search", checkAuthenticated, async (req, res) => {
    const query = "SELECT * FROM exercise ORDER BY name ASC"
    client
      .query(query)
      .then( response => {
        const exercises = response.rows
        const query = "SELECT * FROM area ORDER BY name ASC"
        client
          .query(query)
          .then( resp => {
            const areas = resp.rows
            res.render('./search.ejs', { user: user, areas: areas, exercises: exercises })
          })
          .catch(e => {
            console.error(e.stack)
            res.redirect('/')
          })
      })
      .catch(e => {
        console.error(e.stack)
        res.redirect('/')
      })
})

app.get("/exercise", checkAuthenticated, async (req, res) => {
    var areaNames
    const query = "SELECT * FROM area ORDER BY name ASC"
    client
      .query(query)
      .then( response => {
        const areas = response.rows
        res.render('./exercise.ejs', { user: user, areas: areas })
      })
      .catch(e => {
        console.error(e.stack)
        res.redirect('/')
      })
})

app.get('/area', checkAuthenticated, (req, res) => {
  res.render('area.ejs', { user: user })
})

app.get('/myroutines', checkAuthenticated, (req, res) => {
  res.render('myroutines.ejs', { user: user, routines: routines })
})

app.get('/schedule', checkAuthenticated, (req, res) => {
  res.render('schedule.ejs', { user: user, routines: routines, schedule: schedule })
})

app.get('/results', checkAuthenticated, (req, res) => {
  res.render('results.ejs', { user: user, routines: routines })
})

app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { user: user })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.post('/register', checkNotAuthenticated, async (req, response) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)

    const text = 'INSERT INTO account (name, email, password) VALUES ($1, $2, $3)'
    const values = [req.body.name, req.body.email, hashedPassword]
    client
      .query(text, values)
      .then(res => {
        response.redirect('/login')
      })
      .catch(e => {
        console.error(e.stack)
        response.redirect('/register')
      })
})

app.post('/search', checkAuthenticated, (req, response) => {
  // No fields, return everything
  if(req.body.set == -1 && req.body.area == -1 && req.body.find == '') {
    const text = 'SELECT id, name FROM routine ORDER BY name ASC'
    client
    .query(text)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }

  if(req.body.set != -1 && req.body.area == -1 && req.body.find == '') {
  // only exercise set
    const text = 'SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise = $1))'
    const value = [req.body.set]
    client
    .query(text, value)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }

  if(req.body.set == -1 && req.body.area != -1 && req.body.find == '') {
    // only body part set
    const text = 'SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise IN (SELECT exercise FROM worked WHERE area = $1)))'
    const value = [req.body.area]
    client
    .query(text, value)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }

  if(req.body.set == -1 && req.body.area == -1 && req.body.find != '') {
    // only text
    const text = "SELECT id, name FROM routine WHERE name ILIKE '%' || $1 || '%'"
    const value = [req.body.find]
    client
    .query(text, value)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }

  if(req.body.set != -1 && req.body.area != -1 && req.body.find == '') {
    // exercise and area (no text)
    const text = 'SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise = $1)) UNION SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise IN (SELECT exercise FROM worked WHERE area = $2)))'
    const value = [req.body.set, req.body.area]
    client
    .query(text, value)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }

  if(req.body.set != -1 && req.body.area == -1 && req.body.find != '') {
    // exercise and text (no area)
    const text = "SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise = $1)) UNION SELECT id, name FROM routine WHERE name ILIKE '%' || $2 || '%'"
    const value = [req.body.set, req.body.find]
    client
    .query(text, value)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }

  if(req.body.set == -1 && req.body.area != -1 && req.body.find != '') {
    // area and text (no exercise)
    const text = "SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise IN (SELECT exercise FROM worked WHERE area = $1))) UNION SELECT id, name FROM routine WHERE name ILIKE '%' || $2 || '%'"
    const value = [req.body.area, req.body.find]
    client
    .query(text, value)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }

  if(req.body.set != -1 && req.body.area != -1 && req.body.find != '') {
    // all fields
    const text = "SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise = $1)) UNION SELECT id, name FROM routine WHERE id IN (SELECT routine FROM comprises WHERE sets IN (SELECT id FROM sets WHERE exercise IN (SELECT exercise FROM worked WHERE area = $2))) UNION SELECT id, name FROM routine WHERE name ILIKE '%' || $3 || '%'"
    const value = [req.body.set, req.body.area, req.body.find]
    client
    .query(text, value)
    .then(routine => {
      routines = routine.rows
      response.redirect('/results')
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/search')
    })
  }
})

app.post('/launchroutine', checkAuthenticated, (req, response) => {
  const query = "UPDATE completed SET notes = $1 WHERE id = $2"
  const values = [req.body.notes, req.body.routineid]
//  console.log('notes = ' + req.body.notes);
//  console.log('routineid = ' + req.body.routineid);
  if(req.body.create == -1)
  {
    response.redirect('/')
  }
  else{
    client
      .query(query, values)
      .then(res => {
        //console.log('first query');

          //console.log('second query');
        /*  console.log('exercise = ' + req.body.exercise);
          console.log('reps = ' + req.body.reps);
          console.log('weight = ' + req.body.weight);
          console.log('positive = ' + req.body.positive);
          console.log('hold = ' + req.body.hold);
          console.log('negative = ' + req.body.negative);
          console.log('rest = ' + req.body.rest);
          console.log('hweight = ' + req.body.hweight);
          console.log('hreps = ' + req.body.hreps);*/

          // NEED TO CREATE SET AND GET ID
          const text3 = 'INSERT INTO performed (exercise, reps, weight, positive, hold, negative, rest, hweight, hreps) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id'
          const value3 = [req.body.exercise, req.body.reps, req.body.weight, req.body.positive, req.body.hold, req.body.negative, req.body.rest, req.body.hweight, req.body.hreps]
          client
            .query(text3, value3)
            .then(setId => {
          /*    console.log('third query');
              let exercise = req.body.exercise;
              let reps = req.body.reps;
              let weight = req.body.weight;
              if( weight == null)
              {
                weight == '';
              }
              let positive = req.body.positive;
              if( positive == null)
              {
                positive == '';
              }
              let hold = req.body.hold;
              if( hold == null)
              {
                hold == '';
              }
              let negative = req.body.negative;
              if( negative == null)
              {
                negative == '';
              }
              let rest = req.body.rest;
              if( rest == null)
              {
                console.log('rest is null');
                rest == '';
              }
              let hweight = req.body.hweight;
              if( hweight == null)
              {
                hweight == '';
              }
              let hreps = req.body.hreps;
              if( hreps == null)
              {
                hreps == '';
              }
              const text4 = 'SELECT id FROM performed WHERE exercise = $1 AND reps = $2 AND weight = $3 AND positive = $4 AND hold = $5 AND negative = $6 AND rest = $7 and hweight = $8 and hreps = $9'
              const value4 = [exercise, reps, weight, positive, hold, negative, rest, hweight, hreps]
              client
              .query(text4, value4)
              .then(setId => {*/
              //..  console.log('fourth query');
              //  console.log(setId);
                const text5 = 'INSERT INTO consistsof (completed, performed) VALUES ($1, $2)'
                const value5 = [req.body.routineid, setId.rows[0].id]
                client
                .query(text5, value5)
                .then(res5 => {
                //  console.log('fifth query');
                      response.redirect('/')

                })
                .catch(e => {
                  console.error(e.stack)
                  response.redirect('/')
                })
              /*})
              .catch(e => {
                console.error(e.stack)
                response.redirect('/')
              })*/
            })
            .catch(e => {
              console.error(e.stack)
              response.redirect('/')
            })

      })
      .catch(e => {
        console.error(e.stack)
        response.redirect('/')
      })
  }
})

app.post('/editroutine', checkAuthenticated, (req, response) => {
  const text = 'INSERT INTO routine (name, owner, is_public) VALUES ($1, $2, $3) RETURNING id'
  const isPublic = false
  const values = [req.body.create, user.id, isPublic]
  if(req.body.create == -1)
  {
    response.redirect('/editroutine')
  }
  else{
    client
      .query(text, values)
      .then(resp => {
        /* console.log('first query');
        const text2 = 'SELECT id FROM routine WHERE name = $1 AND owner = $2 AND is_public = $3 ORDER BY id DESC'
        client
        .query(text2, values)
        .then(resp => {
          console.log('second query');
          console.log('exercise = ' + req.body.set);
          console.log('reps = ' + req.body.reps);
          console.log('weight = ' + req.body.weight);
          console.log('positive = ' + req.body.timeUp);
          console.log('hold = ' + req.body.timeHold);
          console.log('negative = ' + req.body.timeDown);
          console.log('rest = ' + req.body.timeRest);*/
          // NEED TO CREATE SET AND GET ID
          const text3 = 'INSERT INTO sets (exercise, reps, weight, positive, hold, negative, rest) VALUES ($1, $2, $3, $4, $5, $6, $7)'
          const value3 = [req.body.set, req.body.reps, req.body.weight, req.body.timeUp, req.body.timeHold, req.body.timeDown, req.body.timeRest]
          client
            .query(text3, value3)
            .then(resps => {
              console.log('third query');
              const text4 = 'SELECT id FROM sets WHERE exercise = $1 AND reps = $2 AND weight = $3 AND positive = $4 AND hold = $5 AND negative = $6 AND rest = $7'
              client
              .query(text4, value3)
              .then(setId => {
                console.log('fourth query');
                const text5 = 'INSERT INTO comprises (routine, sets) VALUES ($1, $2)'
                const value5 = [resp.rows[0].id, setId.rows[0].id]
                client
                .query(text5, value5)
                .then(res5 => {
                  console.log('fifth query');
                  const text6 = 'DELETE FROM myroutines WHERE routine = $1 AND account = $2'
                  const value6 = [req.body.routine, user.id]
                  client
                  .query(text6, value6)
                  .then(res6 => {
                    console.log('sixth query');
                    const text7 = 'INSERT INTO myroutines (routine, account) VALUES ($1, $2)'
                    const value7 = [resp.rows[0].id, user.id]
                    client
                    .query(text7, value7)
                    .then(res7 => {
                      console.log('seventh query');
                      response.redirect('/')
                    })
                    .catch(e => {
                      console.error(e.stack)
                      response.redirect('/editroutine')
                    })
                  })
                  .catch(e => {
                    console.error(e.stack)
                    response.redirect('/editroutine')
                  })
                })
                .catch(e => {
                  console.error(e.stack)
                  response.redirect('/editroutine')
                })
              })
              .catch(e => {
                console.error(e.stack)
                response.redirect('/editroutine')
              })
            })
            .catch(e => {
              console.error(e.stack)
              response.redirect('/editroutine')
            })
        /*})
        .catch(e => {
          console.error(e.stack)
          response.redirect('/editroutine')
        })*/
      })
      .catch(e => {
        console.error(e.stack)
        response.redirect('/editroutine')
      })
  }
})

app.post('/create', checkAuthenticated, (req, response) => {
  const text = 'INSERT INTO routine (name, owner, is_public) VALUES ($1, $2, $3) RETURNING id'
  const isPublic = !req.body.is_private
  const values = [req.body.create, user.id, isPublic]
  if(req.body.create == -1)
  {
    response.redirect('/create')
  }
  else{
    client
      .query(text, values)
      .then(resp => {
        /*const text2 = 'SELECT id FROM routine WHERE name = $1 AND owner = $2 AND is_public = $3'
        client
        .query(text2, values)
        .then(resp => {*/
          // NEED TO CREATE SET AND GET ID
          const text3 = 'INSERT INTO sets (exercise, reps, weight, positive, hold, negative, rest) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id'
          const value3 = [req.body.set, req.body.reps, req.body.weight, req.body.timeUp, req.body.timeHold, req.body.timeDown, req.body.timeRest]
          client
            .query(text3, value3)
            .then(setId => {
              /*const text4 = 'SELECT id FROM sets WHERE exercise = $1 AND reps = $2 AND weight = $3 AND positive = $4 AND hold = $5 AND negative = $6 AND rest = $7'
              client
              .query(text4, value3)
              .then(setId => {*/
                const text5 = 'INSERT INTO comprises (routine, sets) VALUES ($1, $2)'
                const value5 = [resp.rows[0].id, setId.rows[0].id]
                client
                .query(text5, value5)
                .then(ended => {
                  response.redirect('/')
                })
                .catch(e => {
                  console.error(e.stack)
                  response.redirect('/create')
                })
              /*})
              .catch(e => {
                console.error(e.stack)
                response.redirect('/create')
              })*/
            })
            .catch(e => {
              console.error(e.stack)
              response.redirect('/create')
            })
        /*})
        .catch(e => {
          console.error(e.stack)
          response.redirect('/create')
        })*/
      })
      .catch(e => {
        console.error(e.stack)
        response.redirect('/create')
      })
  }
})

app.post('/exercise', checkAuthenticated, (req, response) => {
    const text = 'INSERT INTO exercise (name, owner, is_public) VALUES ($1, $2, $3) RETURNING id'
    const values = [req.body.exercise, user.id, true]
    client
      .query(text, values)
      .then(resp => {
        if(req.body.area == -1)
        {
          response.redirect('/exercise')
        }
        else
        {
          /*const text2 = 'SELECT id FROM exercise WHERE name = $1'
          const value2 = [req.body.exercise]
          client
            .query(text2, value2)
            .then(resp => {*/
              const text3 = 'INSERT INTO worked (exercise, area) VALUES ($1, $2)'
              const value3 = [resp.rows[0].id, req.body.area]
              client
                .query(text3, value3)
                .then(resps => {
                  response.redirect('/create')
                })
                .catch(e => {
                  console.error(e.stack)
                  response.redirect('/exercise')
                })
            /*})
            .catch(e => {
              console.error(e.stack)
              response.redirect('/exercise')
            })*/
          }
        })
        .catch(e => {
          console.error(e.stack)
          response.redirect('/exercise')
        })
        response.redirect('/create')
})

app.post('/area', checkAuthenticated, (req, response) => {
    const text = 'INSERT INTO area (name) VALUES ($1)'
    const values = [req.body.area]
    client
      .query(text, values)
      .then(res => {
        response.redirect('/exercise')
      })
      .catch(e => {
        console.error(e.stack)
        response.redirect('/area')
      })
    response.redirect('/exercise')
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen(3000)
