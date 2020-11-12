var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var system = require('child_process');

var file = {
	save: function(name,text){
		fs.writeFile(name,text,e=>{
			if(e) console.log(e);
		});
	},
	read: function(name,callback){
		fs.readFile(name,(error,buffer)=>{
			if (error) console.log(error);
			else callback(buffer.toString());
		});
	}
}

const random=(min,max)=>Math.floor(min+Math.random()*(max-min+1));

class Tile{
    constructor(x,y,grid) {
        this.x = x;
        this.y = y;
        this.type = 0;
        this.color = '#222';
        this.grid = grid;
    }
}
class Grid{
    constructor(w,h,scale=40) {
        this.tiles = [];
        this.width = w;
        this.height = h;
        this.scale = scale;
        this.offsetX = 0;
        this.offsetY = 0;
        for (let x = 0; x < w; x++) {
            let row = [];
            for (let y = 0; y < h; y++) {
                row.push(new Tile(x,y,this));
            }
            this.tiles.push(row);
        }
    }
    inBounds(x,y){
        return x>=0&&x<this.width&&y>=0&&y<this.height;
    }
    getTileAt(x,y){
        if(this.inBounds(x,y)){
            return this.tiles[x][y];
        }
    }
    forEach(callback) {
        for (let row of this.tiles) {
            for (let tile of row) {
                let stop = callback(tile);
                if (stop) return;
            }
        }
    }
}

class Game{
    // static all = [];
	constructor(host){
		this.host = host;
		this.players = []
		this.grid = new Grid(21,17);
        this.waiting = true;
        this.id = Game.globalid++;
        this.type = 0;
        this.generateMap();
        Game.all.push(this);
        this.addPlayer(host);
	}
    start(){
        this.waiting = false;
        let tiles = this.grid.tiles.flat().map(tile=>tile.type);
        const positions = [{x:1,y:1},{x:1,y:15},{x:19,y:15},{x:19,y:1}];
        let i = 0;
        for(let player of this.players){
            let startpos = positions[i];
            player.emit('startgame',{tiles,startpos});
            i++;
        }
    }
    generateMap(){
        this.generateBlock(1);
        this.generateBlock(2,random(15,40));
        if(random(1,2) == 1) this.generateBlock(3,random(5,10));

        this.grid.getTileAt(1,1).type = 0;
        this.grid.getTileAt(1,2).type = 0;
        this.grid.getTileAt(2,1).type = 0;

        this.grid.getTileAt(1,15).type = 0;
        this.grid.getTileAt(1,14).type = 0;
        this.grid.getTileAt(2,15).type = 0;

        this.grid.getTileAt(19,15).type = 0;
        this.grid.getTileAt(19,14).type = 0;
        this.grid.getTileAt(18,15).type = 0;

        this.grid.getTileAt(19,1).type = 0;
        this.grid.getTileAt(18,1).type = 0;
        this.grid.getTileAt(19,2).type = 0;

        this.grid.forEach(tile=>{
            if(tile.x == 0 || tile.y == this.grid.width-1){
                tile.type = 6;
            }
            if(tile.y == 0 || tile.y == this.grid.height-1){
                tile.type = 6;
            }
        });
    }
    generateBlock(type,amount=random(5,15)){
        let r = amount;
        const THIS = this;
        while(r--) generateSingle();
        function generateSingle(){
            let ptx = random(0,10-1);
            let pty = random(0,8-1);
            if(THIS.grid.getTileAt(10-ptx,8-pty).type !== 0){
                generateSingle();
                return;
            }
            THIS.grid.getTileAt(10-ptx,8-pty).type = type;
            THIS.grid.getTileAt(10+ptx,8-pty).type = type;
            THIS.grid.getTileAt(10-ptx,8+pty).type = type;
            THIS.grid.getTileAt(10+ptx,8+pty).type = type;
        }
    }
    removePlayer(player){
        let ix = this.players.indexOf(player);
        if(ix != -1){
            this.players.splice(ix,1);
        }
        if(this.players.length == 0){
            Game.removeGame(this,true);
        } else if(this.host == player){
            this.host = this.players[0];
        }
        this.update();
    }
    addPlayer(player){
        if(this.players.lenghth == 4) return false;
        this.players.push(player);
        this.update();
        return true;
    }
    update(){
        let playerData = this.players.map(player=>player.name);
        for(let player of this.players){
            player.emit('setPlayers',{players:playerData,host:this.host.name});
        }
    }
}
Game.all = [];
Game.globalid = 0;
Game.removeGame = (game,kick=true) => {
    if(kick){
        for(let player of game.players){
            player.game = null;
            player.emit('get_kicked','Game ended');
        }
        game.players = [];
    }
    if(game.players.length == 0){
        let ix = Game.all.indexOf(game);
        if(ix != -1){
            Game.all.splice(ix,1);
        }
    }
}

class client{
	// static all = [];
	constructor(socket){
		this.socket = socket;
		this.name = null;
		client.all.push(this);
		socket.on('disconnect',e=>{
			let index = client.all.indexOf(this);
			if(index != -1){
				client.all.splice(index,1);
			}
		});
	}
	emit(name,dat){
		this.socket.emit(name,dat);
	}
}
client.all = [];

const port = 80;
const path = __dirname+'/';

app.use(express.static(path+'site/'));
app.get(/.*/,function(request,response){
	response.sendFile(path+'site/');
});

http.listen(port,()=>{console.log('Serving Port: '+port)});

client.prototype.game = null;
io.on('connection',socket=>{
	var c = new client(socket);
    socket.on('name',name=>{
        c.name = name;
        console.log(name+' joined');
    });
    socket.on('creategame',()=>{
        console.log(c.name+' created a game');
        c.game = new Game(c);
    });
    socket.on('get_games',data=>{
        let games = Game.all.filter(game=>game.waiting);
        games = games.map(game=>{
            return {
                host:game.host.name,
                count:game.players.length,
                id: game.id
            };
        });
        c.emit('games',games);
    });
    socket.on('disconnect',e=>{
        if(c.game){
            c.game.removePlayer(c);
        }
    });
    socket.on('join_room',id=>{
        let room = Game.all.filter(game=>game.id==id);
        if(room.length == 0){
            socket.emit('get_kicked','GameGone');
            return;
        }
        if(!room[0].waiting){
            socket.emit('get_kicked','GameGone');
            return;
        }
        if(!room[0].addPlayer(c)){
            socket.emit('get_kicked','GameGone');
            return;
        }
        c.game = room[0];
    });
    socket.on('trystart',()=>{
        if(c.game){
            if(c.game.host == c){
                console.log(c.name+' has started the game');
                c.game.start();
            }
        }
    });
});
