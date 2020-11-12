var grid;
var canvas;
var cts; 
var player; 
var players;
var bombs;

var playing = false;

const grass = getImage('assets/background/15.png');
const pimg = getImage('assets/player/00.png');
const rock = 'assets/background/12.png';
const bush = 'assets/background/05.png';
const tire = 'assets/background/10.png';

// Hitbox.show = true;

const imgs = [null,rock,bush,tire];

let things = [];

function getImage(src){
	let i = create('img');
	i.src = src;
	return i;
}

Tile.prototype.draw = function(){
	let ct = this.getCenter();
	ctx.save();
	ctx.translate(ct.x,ct.y);
	ctx.drawImage(grass,-20,-20);
	ctx.restore();
	if(this.sprite) this.sprite.draw();
}
Grid.prototype.draw = function(){
	this.forEach(tile=>{
		tile.draw();
	});
	// this.Hitbox.DRAW('yellow');
}
Tile.prototype.sprite = null;
Tile.prototype.type = 0;

function setup(data){
	playing = true;
	canvas = obj('canvas');
	ctx = canvas.getContext('2d');
	grid = new Grid(21,17,40);
	canvas.width = grid.width*grid.scale;
	canvas.height = grid.height*grid.scale;
	player = new Sprite('assets/player/00.png');
	player.addAnimation('assets/player/player.anims').then(e=>{
		player.setOffset = new Vector(0,player.h/4);
	})
	let i = 0;
	player.position = grid.getTileAt(data.startpos.x,data.startpos.y).getCenter();
	keys.start();
	player.scale = new Vector(.8,.5);
	player.addMovement(position=>{
		let up = keys.down('arrowup');
		let down = keys.down('arrowdown');
		let left = keys.down('arrowleft');
		let right = keys.down('arrowright');
		player.speed = 5;

		let delta_x = 0;
		let delta_y = 0;

		let stop = false;
		if(up){
			position.y -= player.speed;
			delta_y -= player.speed;
			player.animation.play('walk-up');
		} else if(down){
			position.y += player.speed;
			delta_y += player.speed;
			player.animation.play('walk-down');
		} else stop = true;

		player.position = position;
		getOut(new Vector(0,delta_y));
		position = player.pos.clone();

		if(left){
			position.x -= player.speed;
			delta_x -= player.speed;
			player.animation.play('walk-left');
			stop = false;
		} else if(right){
			position.x += player.speed;
			delta_x += player.speed;
			player.animation.play('walk-right');
			stop = false;
		}

		player.position = position;
		getOut(new Vector(delta_x,0));

		if(stop && player.animation) player.animation.stop();

		// Drop bomb
		if(keys.down(' ')){
			let at = grid.getActiveTile(player.pos.x,player.pos.y);
			if(at) addBombAt(at);
		}

		function touchingHitboxes(){
			let active = grid.getActiveTile(player.pos.x,player.pos.y);
			let touching = grid.Hitbox.touches(player);
			grid.forEach(tile=>{
				if(tile.sprite && tile.sprite.name == "bomb"){
					if(!player.touches(tile.sprite) && active != tile){
						tile.sprite.name = '';
					}
					return;
				}
				if(tile.sprite){
					if(player.touches(tile.sprite)){
						touching = true;
						return true;
					}
				}
			});
			return touching;
		}
		function getOut(move_vec){
			let changex = move_vec.mult(-.05);
			let count = 0;
			while(touchingHitboxes(player)){
				player.position = player.pos.add(changex);
				if(count++ > 100){
					console.warn('Player Stuck');
					break;
				}
			}
		}
	});
	grid.forEach(tile=>{
		let type = data.tiles[i++];
		let src = type === 0 ? '' : imgs[type];
		tile.type = type;
		if(type !== 0 && type !== 6){
			tile.sprite = new Sprite(src);
			if(type == 2){
				tile.sprite.addAnimation('assets/bush/bush.anims');
			}
			tile.sprite.position = tile.getCenter();
		}
	});
	let gw = grid.width-2;
	let gh = grid.height-2;
	let gs = grid.scale;
	grid.Hitbox = new Hitbox(new Vector(canvas.width/2,canvas.height/2),gw*gs,gh*gs);
	loop();
}

async function addBombAt(tile){
	let bomb = new Sprite('assets/bomb/00.png');
	bomb.position = tile.getCenter();
	bomb.name = 'bomb';
	tile.type = 4;
	tile.sprite = bomb;
	await bomb.addAnimation('assets/bomb/bomb.anims');
	audio.play('assets/bomb/dropbomb.wav');
	let wait = bomb.animation.play('drop').then(e=>{
		bomb.name = 'die';
		if(e == 1){
			addRecursiveBombs(tile);
			tile.sprite.animation.play('center');
		}
	});
	await wait;
}

function addRecursiveBombs(tile,range=6){
	audio.play('assets/bomb/explode0.wav');
	tile.sprite.animation.stop();
	tile.sprite = null;
	tile.type = 0;
	const directions = [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}];
	const dirnames = ['bottom','top','right','left'];
	for(let i=0;i<dirnames.length;i++){
		let direction = directions[i];
		let dirname = dirnames[i];
		let count = 1;
		while(count < range){
			let current_tile = grid.getTileAt(tile.x+direction.x*count,tile.y+direction.y*count);
			if(current_tile.type == 1 || current_tile.type == 6){
				break;
			} else if(current_tile.type == 2){
				current_tile.sprite.animation.play('fire').then(e=>{
					current_tile.sprite = null;
					current_tile.type = 0;
				});
				break;
			} else if(current_tile.type == 4){
				if(current_tile.sprite.animation.name=='center') break;
				// current_tile.sprite.animation.stop();
				// current_tile.sprite.animation.play('center');
				// addRecursiveBombs(current_tile);
				break;
			} else {
				let ni = count + 1;
				console.log(ni);
				let next_tile = grid.getTileAt(tile.x+direction.x*ni,tile.y+direction.y*ni);
				if(!next_tile){
					count++;
					break;
				}
				if(next_tile.type == 1 || next_tile.type == 6 || (count+2) > range){
					let flash = new Sprite('assets/bomb/00.png');
					current_tile.type = 4;
					flash.position = current_tile.getCenter();
					current_tile.sprite = flash;
					flash.addAnimation('assets/bomb/bomb.anims').then(e=>{
						flash.animation.play(dirname).then(e=>{
							current_tile.sprite = null;
							current_tile.type = 0;
						});
					});
					break;
				} else {
					let flash = new Sprite('assets/bomb/00.png');
					flash.position = current_tile.getCenter();
					current_tile.sprite = flash;
					current_tile.type = 4;
					flash.addAnimation('assets/bomb/bomb.anims').then(e=>{
						flash.animation.play((dirname=='left'||dirname=='right')?'horizontal':'vertical').then(e=>{
							current_tile.sprite = null;
							current_tile.type = 0;
						});
					});
				}
			}
			count++;
		}
	}
}

function loop(){
	if(playing) setTimeout(loop,1000/30);
	ctx.clearRect(-2,-2,canvas.width/2,canvas.height/2);
	grid.draw();
	player.draw();
}
