const express = require('express');
const ejs = require('ejs');
const path = require('path');
const fs = require("fs");
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const User = require('./models/User');

const PhotonParser = require('./scripts/classes/PhotonPacketParser');
var Cap = require('cap').Cap;
var decoders = require('cap').decoders;
const WebSocket = require('ws');
const { getAdapterIp } = require('./server-scripts/adapter-selector');

const app = express();

// Configuração do MongoDB
mongoose.connect('mongodb+srv://c6sF0V4sKGI39GC7:ClQfqwyLZTLsGXcA@albionradar.9ykijdy.mongodb.net/AlbionRadar?retryWrites=true&w=majority&appName=AlbionRadar', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Conectado ao banco de dados, em caso de não haver login e senha, solicite o seu no discord.gg/3AXs2Fwmgg');
});

BigInt.prototype.toJSON = function() { return this.toString() }

app.use(express.static(__dirname + '/views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'seu-segredo',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware de Autenticação
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Rota de Login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      if (user.password === password) {  // Comparação direta de senhas em texto puro
        req.session.userId = user._id;
        return res.redirect('/settings');
      } else {
        console.log('Senha incorreta');
      }
    } else {
      console.log('Usuário não encontrado');
    }
    res.redirect('/login'); // Redirecionamento de volta para a página de login em caso de falha no login
  } catch (err) {
    console.error('Erro durante o login:', err);
    next(err);
  }
});

// Tratamento de erros específico para a rota de login
app.use('/login', (err, req, res, next) => {
  console.error('Erro durante o login:', err);
  res.redirect('/login');
});

// Rota de Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});



// Rotas Protegidas
app.get('/', requireLogin, (req, res) => {
  const viewName = 'main/';
  res.render('layout', { mainContent: viewName });
});

app.get('/', (req, res) => {
  const viewName = 'main/home'; 
  res.render('layout', { mainContent: viewName});
});

app.get('/home', (req, res) => {
  const viewName = 'main/home'; 
  res.render('./layout', { mainContent: viewName});
});

app.get('/resources', requireLogin, (req, res) => {
  const viewName = 'main/resources';
  res.render('layout', { mainContent: viewName });
});

app.get('/enemies', requireLogin, (req, res) => {
  const viewName = 'main/enemies';
  res.render('layout', { mainContent: viewName });
});

app.get('/chests', requireLogin, (req, res) => {
  const viewName = 'main/chests';
  res.render('layout', { mainContent: viewName });
});

app.get('/map', requireLogin, (req, res) => {
  const viewName = 'main/map';
  const viewRequireName = 'main/require-map';

  fs.access("./images/Maps", function(error) {
    if (error) {
      res.render('layout', { mainContent: viewRequireName });
    } else {
      res.render('layout', { mainContent: viewName });
    }
  });
});

app.get('/ignorelist', requireLogin, (req, res) => {
  const viewName = 'main/ignorelist';
  res.render('layout', { mainContent: viewName });
});

app.get('/settings', requireLogin, (req, res) => {
  const viewName = 'main/settings';
  res.render('layout', { mainContent: viewName });
});

app.get('/drawing', requireLogin, (req, res) => {
  res.render('main/drawing');
});

app.use('/scripts', express.static(__dirname + '/scripts'));
app.use("/mob-info", express.static(__dirname + "/mob-info"));
app.use('/scripts/Handlers', express.static(__dirname + '/scripts/Handlers'));
app.use('/scripts/Drawings', express.static(__dirname + '/scripts/Drawings'));
app.use('/scripts/Utils', express.static(__dirname + '/scripts/Utils'));
app.use('/images/Resources', express.static(__dirname + '/images/Resources'));
app.use('/images/Maps', express.static(__dirname + '/images/Maps'));
app.use('/images/Items', express.static(__dirname + '/images/Items'));
app.use('/images/Flags', express.static(__dirname + '/images/Flags'));
app.use('/sounds', express.static(__dirname + '/sounds'));
app.use('/config', express.static(__dirname + '/config'));

const port = 5001;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

var c = new Cap();

let adapterIp;

if (fs.existsSync('ip.txt'))
  adapterIp = fs.readFileSync('ip.txt', { encoding: 'utf-8', flag: 'r' });

if (!adapterIp) {
  adapterIp = getAdapterIp();
} else {
  console.log();
  console.log(`Usando ultimo adptador de internet principal, caso aja duvida entre no discord https://discord.gg/3AXs2Fwmgg - ${adapterIp}`);
  console.log('em caso de erro, apague o arquivo ip.txt.');
  console.log();
}

const device = Cap.findDevice(adapterIp);
const filter = 'udp and (dst port 5056 or src port 5056)';
var bufSize =  4096;
var buffer = Buffer.alloc(4096);
const manager = new PhotonParser();
var linkType = c.open(device, filter, bufSize, buffer);

c.setMinBytes && c.setMinBytes(0);

c.on('packet', function (nbytes, trunc) {
  let ret = decoders.Ethernet(buffer);
  ret = decoders.IPV4(buffer, ret.offset);
  ret = decoders.UDP(buffer, ret.offset);

  let payload = buffer.slice(ret.offset, nbytes);

  try {
    manager.handle(payload);
  } catch { }
});

const server = new WebSocket.Server({ port: 5002, host: 'localhost' });
server.on('listening', () => {
  console.log("openned");

  manager.on('event', (dictionary) => {
    const dictionaryDataJSON = JSON.stringify(dictionary);
    server.clients.forEach(function(client) {
      client.send(JSON.stringify({ code: "event", dictionary: dictionaryDataJSON }));
    });
  });

  manager.on('request', (dictionary) => {
    const dictionaryDataJSON = JSON.stringify(dictionary);
    server.clients.forEach(function(client) {
      client.send(JSON.stringify({ code: "request", dictionary: dictionaryDataJSON }));
    });
  });

  manager.on('response', (dictionary) => {
    const dictionaryDataJSON = JSON.stringify(dictionary);
    server.clients.forEach(function(client) {
      client.send(JSON.stringify({ code: "response", dictionary: dictionaryDataJSON }));
    });
  });
});

server.on('close', () => {
  console.log('closed');
  manager.removeAllListeners();
});
