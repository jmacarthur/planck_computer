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
	// Iterate over joints
	for (let joint = this.world.getJointList(); joint; joint = joint.getNext()) {
	    this.renderJoint(joint);
	}
	window.requestAnimationFrame(this.loop.bind(this));
    }
    renderJoint(joint) {
	this.ctx.strokeStyle = '#ff0000';

	var type = joint.getType()
	if(type == "distance-joint") {
	    var pos = joint.getLocalAnchorA();
	    var pos2 = joint.getBodyA().getPosition();
	    var posB = joint.getLocalAnchorB();
	    var posB2 = joint.getBodyB().getPosition();
	    this.ctx.beginPath();
	    this.ctx.moveTo((pos.x + pos2.x)*this.scale, (pos.y + pos2.y)*this.scale, 5, 0, Math.PI*2);
	    this.ctx.lineTo((posB.x + posB2.x)*this.scale, (posB.y + posB2.y) *this.scale, 5, 0, Math.PI*2);
	    this.ctx.stroke();

	} else if(type == "revolute-joint") {
	    var pos = joint.getLocalAnchorA();
	    var pos2 = joint.getBodyA().getPosition();
	    this.ctx.beginPath();
	    this.ctx.arc((pos.x + pos2.x)*this.scale, (pos.y + pos2.y)*this.scale, 5, 0, Math.PI*2);
	    this.ctx.stroke();
	} else {
	    console.log("Rendering unknown joint type "+type);
	}
    }
    renderBody(body) {
	this.ctx.strokeStyle = '#000000';
	var pos = body.getPosition();
	if('shapeOverride' in body) {
	    this.renderPolygon(body.shapeOverride, pos.x*this.scale, pos.y*this.scale);
	} else {
	    for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
		this.renderFixture(fixture, pos.x*this.scale, pos.y*this.scale);
	    }
	}
    }
    renderPolygon(vertices, offsetx, offsety) {
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
    }
    renderFixture(fixture, offsetx, offsety) {
	var shapetype = fixture.getType();
	var shape = fixture.getShape();
	if (shapetype == "polygon") {
	    this.renderPolygon(shape.m_vertices, offsetx, offsety);
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