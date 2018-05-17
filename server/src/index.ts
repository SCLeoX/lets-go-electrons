import { createServer } from 'http';
import * as createSocket from 'socket.io';
import * as fs from 'fs';
import * as url from 'url';
import { join } from 'path';

const indexPath = join(__dirname, './../../index.html');
const scriptPath = join(__dirname, './../../client/dist/bundle.js');
const server = createServer((req, res) => {
  res.statusCode = 200;
  const target = url.parse(req.url!).pathname!.substr(1);
  let path = target === 'script.js'
    ? scriptPath
    : indexPath;
  fs.createReadStream(path).pipe(res).once('end', () => {
    res.end();
  });
});

const io = createSocket(server);

interface IPlayer {
  id: string;
  name: string;
  live: boolean;
  x: number;
  y: number;
}

const players = new Map<string, IPlayer>();

const boardcastPlayers = () => {
  io.sockets.emit('players', Array.from(players.entries()));
};

let started = false;
let lastObjects: Array<any> = [];

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.pow(
  Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2),
  0.5,
);

let spawnAreaX = 0;
let spawnAreaY = 0;
let spawnAreaWidth = 0;
let spawnAreaHeight = 0;

let loopInterval = 100;

const loop = () => {
  if (spawnAreaWidth !== 0 && spawnAreaHeight !== 0) {
    const playersArray = Array.from(players.values());
    _MainLoop: for (const player of playersArray) {
      if (player.live) {
        continue;
      }
      let tx = spawnAreaX + spawnAreaWidth * Math.random();
      let ty = spawnAreaY + spawnAreaHeight * Math.random();
      for (const testingPlayer of playersArray) {
        if (testingPlayer.live && dist(tx, ty, testingPlayer.x, testingPlayer.y) < 100) {
          continue _MainLoop;
        }
      }
      player.x = tx;
      player.y = ty;
      player.live = true;
      io.sockets.connected[player.id].emit('teleport', {
        x: tx,
        y: ty,
        live: true,
      });
    }
    boardcastPlayers();
  }
  setTimeout(loop, loopInterval);
};

setTimeout(loop, loopInterval);

io.on('connection', socket => {
  socket.on('join', data => {
    players.set(socket.id, {
      id: socket.id,
      name: data.name,
      live: false,
      x: 0,
      y: 0,
    });
    boardcastPlayers();
    if (started) {
      socket.emit('start');
      socket.emit('objects', lastObjects);
    }
  });
  socket.on('disconnect', () => {
    players.delete(socket.id);
    boardcastPlayers();
  });
  socket.on('start', () => {
    io.sockets.emit('start');
    started = true;
    boardcastPlayers();
  });
  socket.on('objects', objects => {
    io.sockets.emit('objects', objects);
    for (const player of Array.from(players.values())) {
      player.live = false;
    }
    lastObjects = objects;
  });
  socket.on('spawnArea', spawnArea => {
    spawnAreaX = spawnArea.x;
    spawnAreaY = spawnArea.y;
    spawnAreaWidth = spawnArea.width;
    spawnAreaHeight = spawnArea.height;
  });
  socket.on('update', data => {
    const player = players.get(socket.id);
    if (!player) {
      return;
    }
    player.x = data.x;
    player.y = data.y;
    player.live = data.live;
  });
  socket.on('loopInterval', i => {
    loopInterval = i;
  });
  // socket.emit('news', { hello: 'world' });
  // socket.on('my other event', function (data) {
  //   console.log(data);
  // });
});

server.listen(80);
