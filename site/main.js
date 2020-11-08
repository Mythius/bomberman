const socket = io();
var NAME="";

obj('input').focus();
hide(obj('#lobby'));
hide(obj('#gamelobby'));
hide(obj('#game'));
obj('input').on('keydown',e=>{
	if(e.keyCode == 13){
		join(obj('input').value||'');
	}
});

obj('button').on('click',e=>{
	join(obj('input').value||'');
});

obj('#creategame').on('click',e=>{
	hide(obj('#startmenu'));
	socket.emit('creategame');
});

function join(name){
	NAME = name;
	socket.emit('name',name);
	socket.emit('get_games');
	hide(obj('#startmenu'));
	show(obj('#lobby'));
}

socket.on('games',games=>{
	obj('#games').innerHTML = '';
	let refresh = create('Button','Refresh');
	refresh.on('click',e=>{
		socket.emit('get_games');
	});
	if(games.length == 0){
		obj('#games').innerHTML = 'No Games...';
	}
	obj('#games').appendChild(refresh);
	for(let game of games){
		let item = create('li',game.host);
		obj('#games').appendChild(item);
		item.on('click',e=>{
			socket.emit('join_room',game.id);
		});
	}
});

socket.on('setPlayers',data=>{
	hide(obj('#lobby'));
	hide(obj('#game'));
	show(obj('#gamelobby'));
	let players = data.players;
	obj('#players').innerHTML = '';
	for(let player of players){
		let item = create('li',player);
		obj('#players').appendChild(item);
	}
	obj('#startgame').disasabled = data.host == name;
});

socket.on('startgame',data=>{
	hide(obj('#gamelobby'));
	show(obj('#game'));
});