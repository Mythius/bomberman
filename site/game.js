var grid;
var canvas;
var cts; 
var player; 
var players;
var bombs;

function setup(){
	canvas = obj('canvas');
	ctx = canvas.getContext('2d');
	grid = new Grid(21,17);
	player = new Sprite;
	player.addAnimation('assets/player/player.anims');
}

function loop(){

}
