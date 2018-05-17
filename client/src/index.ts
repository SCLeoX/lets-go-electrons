import * as createSocket from 'socket.io-client';

const page0 = document.getElementById('page0') as HTMLDivElement;
const page1 = document.getElementById('page1') as HTMLDivElement;
const page2 = document.getElementById('page2') as HTMLDivElement;
const buttonConfirm = document.getElementById('button-confirm') as HTMLDivElement;
const nameInput = document.getElementById('name-input') as HTMLInputElement;
const connectedPeersList = document.getElementById('connected-peers-list') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

import { s0obj, s0spawnArea } from './s0';
import { s1obj, s1spawnArea } from './s1';
import { s2obj, s2spawnArea } from './s2';

// nameInput.value = 'Operator';
nameInput.focus();

buttonConfirm.addEventListener('click', () => {
  let name = nameInput.value;
  if (name === '') {
    alert('Name cannot be empty.');
    return;
  }
  if (name.length < 2) {
    alert("Name too short.");
    return;
  }
  if (name.toLowerCase().includes('luke')) {
    alert('Name "Buddhist" will be used instead.');
    name = 'Buddhist';
  }
  if (name.toLowerCase().includes('nic')) {
    alert('Name "Nichologist" will be used instead.');
    name = 'Nichologist';
  }
  page0.style.transform = 'translate(calc(-100% - 50vw), -50%)';
  page1.style.transform = 'translate(-50%, -50%)';

  const socket = createSocket(window.location.origin);

  interface IPlayer {
    name: string;
    live: boolean;
    x: number;
    y: number;
    pts: number;
  }

  let players = new Map<string, IPlayer>();
  let started = false;
  let width: number;
  let height: number;

  interface IObject {
    type: string;
    x: number;
    y: number;
    data: any;
  }

  let x = 0;
  let y = 0;
  let live = false;

  let cameraX = 0;
  let cameraY = 0;
  let cameraZoomLevel = -5;
  let cameraZoom: number;
  
  let damage = 0;

  const updateCamerZoom = () => {
    cameraZoom = Math.atan(cameraZoomLevel / 4) * 6 / Math.PI + 3.02;
  };

  updateCamerZoom();
  
  canvas.addEventListener('mousewheel', event => {
    cameraZoomLevel += Math.sign(event.wheelDeltaY);
    updateCamerZoom();
  });

  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener('mousemove', event => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  const a2cX = (x: number) => (x - cameraX) * cameraZoom + width / 2;
  const a2cY = (y: number) => (y - cameraY) * cameraZoom + height / 2;
  const c2aX = (x: number) => (x - width / 2) / cameraZoom + cameraX;
  const c2aY = (y: number) => (y - height / 2) / cameraZoom + cameraY;

  let objects: Array<IObject> = [];

  let lastTime = Date.now();

  const dist = (x1: number, y1: number, x2: number, y2: number) => Math.pow(
    Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2),
    0.5,
  );

  const render = () => {
    const thisTime = Date.now();
    let deltaT = thisTime - lastTime;
    lastTime = thisTime;
    ctx.clearRect(0, 0, width, height);
    if (live) {
      const aMouseX = c2aX(mouseX);
      const aMouseY = c2aY(mouseY);
      const angle = Math.atan2(aMouseY - y, aMouseX - x);
      const speed = Math.min(240, dist(aMouseX, aMouseY, x, y));
      x += Math.cos(angle) * deltaT / 1000 * speed;
      y += Math.sin(angle) * deltaT / 1000 * speed;
      cameraX = x;
      cameraY = y;
    }
    for (const object of objects) {
      switch (object.type) {
        case 'vw': {
          ctx.fillStyle = 'black';
          ctx.fillRect(
            a2cX(object.x),
            a2cY(object.y),
            5 * cameraZoom,
            (object.data.size + 5) * cameraZoom,
          )
          break;
        }
        case 'hw': {
          ctx.fillStyle = 'black';
          ctx.fillRect(
            a2cX(object.x),
            a2cY(object.y),
            (object.data.size + 5) * cameraZoom,
            5 * cameraZoom,
          )
          break;
        }
        case 'txt': {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.font = `${object.data.size * cameraZoom}px Arial`;
          ctx.textAlign = 'left';
          ctx.fillText(object.data.content, a2cX(object.x), a2cY(object.y));
          break
        }
        case 'rect': {
          ctx.fillStyle = object.data.fill;
          ctx.fillRect(
            a2cX(object.x),
            a2cY(object.y),
            object.data.width * cameraZoom,
            object.data.height * cameraZoom,
          );
          break
        }
        default: throw new Error(`Unknown type: ${object.type}`);
      }
    }
    for (const player of Array.from(players.values())) {
      if (!player.live || player.name === name) {
        continue;
      }
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.ellipse(
        a2cX(player.x),
        a2cY(player.y),
        10 * cameraZoom,
        10 * cameraZoom,
        0,
        0,
        2 * Math.PI,
      );
      ctx.fill();
      ctx.font = `${12 * cameraZoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(player.name, a2cX(player.x), a2cY(player.y - 18));
    }
    if (live) {
      ctx.fillStyle = 'slateBlue';
      ctx.beginPath();
      ctx.ellipse(
        a2cX(x),
        a2cY(y),
        10 * cameraZoom,
        10 * cameraZoom,
        0,
        0,
        2 * Math.PI,
      );
      ctx.fill();
      ctx.font = `${12 * cameraZoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(name, a2cX(x), a2cY(y - 18));
      for (const player of Array.from(players.values())) {
        if (player.live && player.name !== name) {
          const d = dist(x, y, player.x, player.y);
          if (d < 200) {
            ctx.beginPath();
            ctx.moveTo(a2cX(x), a2cY(y));
            ctx.lineTo(a2cX(player.x), a2cY(player.y));
            ctx.lineWidth = (200 - d) / 20 * cameraZoom;
            ctx.strokeStyle = 'red';
            ctx.stroke();
          }
          if (d < 100) {
            damage += 100 / (d + 0.1) * deltaT / 1000;
          }
        }
      }
      for (const object of Array.from(objects.values())) {
        if (object.type === 'vw') {
          if (y > object.y && y < object.y + object.data.size) {
            const d = Math.abs(x - object.x);
            if (d < 100) {
              ctx.beginPath();
              ctx.moveTo(a2cX(x), a2cY(y));
              ctx.lineTo(a2cX(object.x), a2cY(y));
              ctx.lineWidth = (100 - d) / 10 * cameraZoom;
              ctx.strokeStyle = 'red';
              ctx.stroke();
            }
            if (d < 50) {
              damage += 50 / (d + 0.1) * deltaT / 1000;
            }
          }
        } else if (object.type === 'hw') {
          if (x > object.x && x < object.x + object.data.size) {
            const d = Math.abs(y - object.y);
            if (d < 100) {
              ctx.beginPath();
              ctx.moveTo(a2cX(x), a2cY(y));
              ctx.lineTo(a2cX(x), a2cY(object.y));
              ctx.lineWidth = (100 - d) / 10 * cameraZoom;
              ctx.strokeStyle = 'red';
              ctx.stroke();
            }
            if (d < 50) {
              damage += 50 / (d + 0.1) * deltaT / 1000;
            }
          }
        }
      }
      damage = Math.max(0, damage - deltaT / 10000);
      ctx.fillStyle = `rgba(255, 0, 0, ${damage})`;
      ctx.fillRect(0, 0, width, height);
      if (damage >= 1) {
        damage = 0;
        live = false;
      }
    }

    {
      const playersArray = Array.from(players.values()).sort(
        (b, a) => a.pts - b.pts
      );
      ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
      ctx.fillRect(10, 10, 200, 30 * playersArray.length);
      let i = 30;
      for (const player of playersArray) {
        ctx.fillStyle = 'black';
        ctx.font = `16px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(
          `${player.name} (${player.pts})`,
          20, i,
        );
        i += 30;
      }

    }
    requestAnimationFrame(render);
  }

  const updateWH = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', updateWH);
  updateWH();
  socket.on('objects', (data: any) => {
    objects = data;
    live = false;
  });

  const updatePlayersList = () => {
    if (!started) {
      while (connectedPeersList.firstChild) {
        connectedPeersList.removeChild(connectedPeersList.firstChild);
      }
      for (const player of Array.from(players.values())) {
        const li = document.createElement('li');
        li.innerText = player.name;
        connectedPeersList.appendChild(li);
      }
    }
  }

  socket.on('teleport', (data: any) => {
    x = data.x;
    y = data.y;
    live = data.live;
  });
  socket.on('players', (data: any) => {
    players = new Map(data);
    updatePlayersList();
    socket.emit('update', {
      x, y, live,
    });
  });
  socket.on('start', () => {
    page1.style.transform = 'translate(calc(-100% - 50vw), -50%)';
    page2.style.transform = 'translate(-50%, -50%)';
    started = true;
    render();
  });
  if (name !== 'Operator') {
    socket.emit('join', { name });
  } else {
    const handle = (window as any).handle = {
      start: () => (socket.emit('start'), handle.s0()),
      loop: (interval: number) => (socket.emit('loopInterval', interval), null),
      s0: () => {
        socket.emit('objects', s0obj)
        socket.emit('spawnArea', s0spawnArea)
      },
      s1: () => {
        socket.emit('objects', s1obj)
        socket.emit('spawnArea', s1spawnArea)
      },
      s2: () => {
        socket.emit('objects', s2obj)
        socket.emit('spawnArea', s2spawnArea)
      },
    };
  }
});

