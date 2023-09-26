'use strict';

const pl = planck;
const {Vec2, Box, Polygon, Testbed} = pl;

function step_function(ms) {
    // This runs for every simulation step
}

function createWorld(world) {
    // Create the ground object
    var ground = world.createBody();

    var groundFD = {
	filterCategoryBits: 2,
	filterMaskBits: 0xFFFF,
	filterGroupIndex: 0,
    };
    ground.createFixture({
	shape: new pl.Edge(new Vec2(-50, 0), new Vec2(+50, 0)),
    });

    // Create a dynamic body with two fixtures as a composite
    let body = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 4.0)
    });

    body.createFixture({
	shape: new Box(1.0, 1.0),
	density: 1.0,
	friction: 0.3,
    });

    body.createFixture({
	shape: new Polygon([Vec2(0,0), Vec2(2,0), Vec2(0,2)]),
	density: 1.0,
	friction: 0.3,
    });

    var fake_shape = new Box(1.0,1.0);
    fake_shape.draw_m_vertices =  [Vec2(0,1), Vec2(0,2), Vec2(2,0), Vec2(1,0), Vec2(1,-1), Vec2(-1,-1), Vec2(-1,1)];
    body.fixtureOverride = fake_shape;

    // Create a box with a rotary joint
    let smallbox = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 8.0)
    });

    smallbox.createFixture({
	shape: new Box(1.0, 1.0),
	density: 1.0,
	friction: 0.3,
    });

    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	lowerAngle: -0.25 * Math.PI,
	upperAngle: 0.0 * Math.PI,
	enableLimit: true,
    }, ground, smallbox, Vec2(0.0, 8.0)));


    // Create a box with a prismatic joint
    let smallbox2 = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 12.0)
    });

    smallbox2.createFixture({
	shape: new Box(1.0, 1.0),
	density: 1.0,
	friction: 0.3,
    });
    var MOTOR_SPEED = 10;
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : 20.0,
	enableLimit : true
    }, ground, smallbox2, Vec2(0.0, 12.0), Vec2(1.0,0.0)));

    // Create another box with a distance restraint to the second
    let smallbox3 = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 16.0)
    });

    smallbox3.createFixture({
	shape: new Box(1.0, 1.0),
	density: 1.0,
	friction: 0.3,
    });
    var distanceJoint = world.createJoint(pl.DistanceJoint({
    }, smallbox2, Vec2(0.0, 12.0), smallbox3, Vec2(0.0,16.0)));

    // Create two suspended boxes, connected to a third 'magic connector'

    let magic1 = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 20.0)
    });

    var box1 = new Box(1.0,0.5);
    box1.caption = "AA";
    magic1.createFixture({
	shape: box1,
	density: 1.0,
	friction: 0.3,
    });
    var box2 = new Polygon([new Vec2(10.0-1.0, -0.5), new Vec2(10.0+1.0,-0.5), new Vec2(10.0+1.0, 0.5), new Vec2(10.0-1.0, 0.5)]);
    box2.caption = "AA";
    magic1.createFixture({
	shape: box2,
	density: 1.0,
	friction: 0.3,
    });
    var prismaticJoint2 = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : 20.0,
	enableLimit : true
    }, ground, magic1, Vec2(0.0, 20.0), Vec2(1.0,0.0)));

    let smallbox4 = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 18.0)
    });
    smallbox4.createFixture({
	shape: new Box(1.0, 1.0),
	density: 1.0,
	friction: 0.3,
    });
    var distanceJoint2 = world.createJoint(pl.DistanceJoint({
    }, magic1, Vec2(0.0, 20.0), smallbox4, Vec2(0.0,20.0)));

    let smallbox5 = world.createBody({
	type: "dynamic",
	position: new Vec2(10.0, 18.0)
    });
    smallbox5.createFixture({
	shape: new Box(1.0, 1.0),
	density: 1.0,
	friction: 0.3,
    });
    var distanceJoin3 = world.createJoint(pl.DistanceJoint({
    }, magic1, Vec2(10.0, 20.0), smallbox5, Vec2(10.0,20.0)));
}

class Renderer {
    world = null;
    started = false;
    scale = 10.0;
    canvas = null;
    dragging = false;
    drag_start_x = 0;
    drag_stary_y = 0;
    view_offset_x = 100;
    view_offset_y = -300;
    start(world, canvas) {
	this.world = world;
	this.canvas = canvas;
	this.ctx = canvas.getContext("2d");
	this.ctx.scale(1,-1);
	this.ctx.translate(this.view_offset_x, this.view_offset_y);
	this.loop(window, 0);
	canvas.addEventListener('mousemove', this.mousemove.bind(this));
	canvas.addEventListener('mousedown', this.mousedown.bind(this));
	canvas.addEventListener('mouseup', this.mouseup.bind(this));

    }
    mousedown(e) {
	this.drag_start_x = e.x;
	this.drag_start_y = -e.y;
	this.dragging = true;
    }
    mousemove(e) {
	if(this.dragging) {
	    var dx = e.x-this.drag_start_x;
	    var dy = -e.y-this.drag_start_y;
	    this.ctx.translate(dx, dy);
	    this.view_offset_x += dx;
	    this.view_offset_y += dy;
	    this.drag_start_x = e.x;
	    this.drag_start_y = -e.y;
	}
    }
    mouseup(e) {
	this.dragging = false;
    }

    loop(dt) {
	//console.log("Loop iteration at "+dt+"ms");
	this.world.step(1 / 60);
	this.ctx.clearRect(-this.view_offset_x, this.view_offset_y, this.canvas.width, this.canvas.height);
	for (let body = this.world.getBodyList(); body; body = body.getNext()) {
	    this.renderBody(body);
	}
	window.requestAnimationFrame(this.loop.bind(this));
    }
    renderBody(body) {
	var pos = body.getPosition();
	//console.log("Body is present at "+pos.x+","+pos.y);
	for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
	    this.renderFixture(fixture, pos.x*this.scale, pos.y*this.scale);
	}
    }
    renderFixture(fixture, offsetx, offsety) {
	var shapetype = fixture.getType();
	var shape = fixture.getShape();
	if (shapetype == "polygon") {
	    var vertices = shape.m_vertices;
	    this.ctx.beginPath();
	    for(let i=0;i<vertices.length;i++) {
		var v = vertices[i];
		if(i==0) {
		    this.ctx.moveTo(v.x*this.scale+offsetx, v.y*this.scale+offsety);
		} else {
		    this.ctx.lineTo(v.x*this.scale+offsetx, v.y*this.scale+offsety);
		}
	    }
	    this.ctx.closePath();
	    this.ctx.stroke();
	} else if (shapetype == "edge") {
	    this.ctx.beginPath();
	    this.ctx.moveTo(shape.m_vertex1.x, shape.m_vertex1.y);
	    this.ctx.lineTo(shape.m_vertex2.x, shape.m_vertex2.y);
	    this.ctx.stroke();
	} else {
	    console.log("Unrenderable shape type "+shapetype);
	}
    }
}

window.onload = (() => {
    console.log("onload");

    var canvas = document.getElementsByTagName('canvas')[0];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var world = planck.World({gravity: Vec2(0.0,-9.8)});
    createWorld(world);

    const renderer = new Renderer();
    renderer.start(world, canvas);

    console.log("Created world");
});
