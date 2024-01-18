const pl = planck;
const {Vec2, Box, Polygon, Circle, Rot} = pl;

class Renderer {
    world = null;
    started = false;
    scale = 5.0;
    canvas = null;
    dragging = false;
    drag_start_x = 0;
    drag_stary_y = 0;
    view_offset_x = 100;
    view_offset_y = -300;
    spinner = 0;
    simulating = false;
    stoprunloop = false;
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
	document.addEventListener('keydown', this.keydown.bind(this));
    }
    keydown(e) {
	console.log("Key down: '"+e.key+"'");
	if (e.key == " "){
	    this.simulating = !this.simulating;
	} else if (e.key == "q"){
	    this.stoprunloop = true;
	} else if (e.key == "="){
	    this.scale += 1;
	} else if (e.key == "-"){
	    this.scale -= 1;
	}
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
	if(this.simulating) {
	    this.world.step(1 / 60);
	}
	this.ctx.clearRect(-this.view_offset_x, -this.view_offset_y-this.canvas.height, this.canvas.width, this.canvas.height);
	for (let body = this.world.getBodyList(); body; body = body.getNext()) {
	    this.renderBody(body);
	}
	// Iterate over joints
	for (let joint = this.world.getJointList(); joint; joint = joint.getNext()) {
	    this.renderJoint(joint);
	}
	// Add origin mark
	this.ctx.strokeStyle = '#ff0000';
	this.ctx.beginPath();
	this.ctx.moveTo(0, -10);
	this.ctx.lineTo(0, 10);
	this.ctx.moveTo(10, 0);
	this.ctx.lineTo(-10, 0);
	this.ctx.stroke();

	// Add spinner
	this.ctx.beginPath();
	this.ctx.arc(16-this.view_offset_x, 16-this.view_offset_y-32, 16, (this.spinner/100)*Math.PI*2, (this.spinner/100)*Math.PI*2+Math.PI);
	this.ctx.fill();
	this.spinner = (this.spinner+1)%100;

	if(!this.stoprunloop) {
	    window.requestAnimationFrame(this.loop.bind(this));
	}
    }
    renderJoint(joint) {
	var type = joint.getType()
	if(type == "distance-joint") {
	    this.ctx.strokeStyle = '#ff0000';
	    this.ctx.fillStyle = '#ff0000';
	    var pos = joint.getLocalAnchorA();
	    var pos2 = joint.getBodyA().getPosition();
	    var rot = joint.getBodyA().getAngle();
	    pos = Rot.mul(Rot(rot),pos);
	    var posB = joint.getLocalAnchorB();
	    var posB2 = joint.getBodyB().getPosition();
	    var rotB = joint.getBodyB().getAngle();
	    posB = Rot.mul(Rot(rotB),posB);
	    this.ctx.beginPath();
	    this.ctx.moveTo((pos.x + pos2.x)*this.scale, (pos.y + pos2.y)*this.scale);
	    this.ctx.lineTo((posB.x + posB2.x)*this.scale, (posB.y + posB2.y) *this.scale);
	    this.ctx.stroke();
	    this.ctx.beginPath();
	    this.ctx.arc((posB.x + posB2.x)*this.scale, (posB.y + posB2.y) *this.scale, 2, 0, Math.PI*2);
	    this.ctx.arc((pos.x + pos2.x)*this.scale, (pos.y + pos2.y) *this.scale, 2, 0, Math.PI*2);
	    this.ctx.fill();

	} else if(type == "revolute-joint") {
	    this.ctx.strokeStyle = '#ff0000';
	    var pos = joint.getLocalAnchorA();
	    var pos2 = joint.getBodyA().getPosition();
	    this.ctx.beginPath();
	    this.ctx.arc((pos.x + pos2.x)*this.scale, (pos.y + pos2.y)*this.scale, 5, 0, Math.PI*2);
	    this.ctx.stroke();
	} else {
	    //console.log("Rendering unknown joint type "+type);
	}
    }
    renderBody(body) {
	this.ctx.save();
	var pos = body.getPosition();
	var rot = body.getAngle();
	this.ctx.translate(pos.x*this.scale, pos.y*this.scale);
	this.ctx.rotate(rot);
	if('shapeOverride' in body) {
	    for(var i=0;i<body.shapeOverride.length;i++) {
		if(body.shapeOverride[i].colour) {
		    this.ctx.strokeStyle = body.shapeOverride[i].colour;
		} else {
		    this.ctx.strokeStyle = "#000000";
		}
		this.renderPolygon(body.shapeOverride[i].m_vertices, 0, 0);
	    }
	} else {
	    for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
		this.renderFixture(fixture, 0, 0);
	    }
	}
	// Does this thing have a text label?
	if('label' in body) {
	    this.ctx.fillStyle = "#000000";
	    var fontsize = Math.floor(this.scale*2);
	    this.ctx.font = fontsize+"px Arial";
	    this.ctx.textAlign = "center";
	    this.ctx.save();
	    this.ctx.scale(1,-1);
	    this.ctx.fillText(body.label, body.labelx, -body.labely);
	    this.ctx.restore();
	}
	this.ctx.restore();
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
	var collisions = fixture.getFilterMaskBits()
	var shapetype = fixture.getType();
	var shape = fixture.getShape();
	if(collisions == 0) {
	    this.ctx.strokeStyle = "#cfcfcf";
	} else {
	    this.ctx.strokeStyle = "#000000";
	}
	if (shapetype == "polygon") {
	    this.renderPolygon(shape.m_vertices, offsetx, offsety);
	} else if (shapetype == "edge") {
	    this.ctx.beginPath();
	    this.ctx.moveTo(shape.m_vertex1.x*this.scale+offsetx, shape.m_vertex1.y*this.scale+offsety);
	    this.ctx.lineTo(shape.m_vertex2.x*this.scale+offsetx, shape.m_vertex2.y*this.scale+offsety);
	    this.ctx.stroke();
	} else if (shapetype == "circle") {
	    var centre = shape.getCenter();
	    this.ctx.beginPath();
	    this.ctx.arc(centre.x*this.scale+offsetx, centre.y*this.scale+offsety, shape.m_radius*this.scale, 0, Math.PI*2);
	    this.ctx.stroke();
	} else {
	    console.log("Unrenderable shape type "+shapetype);
	}
    }
}
