// https://www.techiediaries.com/fake-api-jwt-json-server/

const fs = require('fs');
const bodyParser = require('body-parser');
const jsonServer = require('json-server');
const session = require('express-session');

const hasAuth = process.argv[2] !== 'noauth';

const port = process.env.PORT || 3001;

const server = jsonServer.create();

const routerExpenses = jsonServer.router('expenses.json');

let data = {};
let userdb = [];

server.use(jsonServer.defaults());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

const SECRET_KEY = 'aFuhVas87asd62kjsDf';

const sessionConfig = {
  name: 'user-expenses',
  secret: SECRET_KEY,
  proxy: true,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: process.env.NODE_ENV === 'development',
    maxAge: 1000 * 60,
  },
};

server.use(session(sessionConfig));

function loadData() {
  data = JSON.parse(fs.readFileSync('users.json', 'UTF-8'));
  userdb = data.users;
}

// Check if the user exists in database
function findUser({ email, password }) {
  loadData();
  return userdb.find(
    user => user.email === email && user.password === password
  );
}

server.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = findUser({ email, password });
  if (!user) {
    const status = 401;
    const message = 'Incorrect email or password';
    res.status(status).json({ status, message });
  } else {
    req.session.user = { name: user.name, email: user.email };
    res.status(200).json(req.session.user);
  }
});

server.post('/auth/signUp', (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userFound = findUser({ email, password });
    if (userFound) {
      const status = 401;
      const message = 'User already exists';
      res.status(status).json({ status, message });
    } else {
      const user = {
        id: data.generator.nextId++,
        name,
        email,
        password,
      };
      userdb.push(user);
      fs.writeFileSync('users.json', JSON.stringify(data, null, 2));
      res.send(user);
    }
  } catch (error) {
    next(error);
  }
});

server.get('/auth/user', (req, res) => {
  if (req.session.user) {
    res.status(200).json(req.session.user);
  } else {
    res.status(401).json({ status: 401, message: 'Not authenticated' });
  }
});

server.post('/auth/logout', (req, res) => {
  if (req.session.user) {
    req.session.destroy(() => res.status(200).json({ message: 'Signed out' }));
  } else {
    res.status(401).json({ status: 401, message: 'Not authenticated' });
  }
});

if (hasAuth) {
  server.use(/^(?!\/auth).*$/, (req, res, next) => {
    if (!req.session.user) {
      const status = 401;
      res.status(status).json({ status, message: 'Not authenticated' });
      return;
    }
    next();
  });
}

server.use(routerExpenses);

server.listen(port, () =>
  console.log(`Servidor inicializado, auth=${hasAuth}`)
);
