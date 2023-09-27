'use strict';

function merge(original_hash, added_hash) {
    Object.keys(added_hash).forEach(function(key) {
	original_hash[key] = added_hash[key];
    });
    return original_hash;
}

function addFixture(body, shape, physics, collisions) {
    var properties = {shape: shape};
    merge(properties, physics);
    merge(properties, collisions);
    return body.createFixture(properties);
}

function box(x, y, width, height) {
    return new Box(width/2, height/2, new Vec2(x+width/2, y+height/2));
}

function createWorld(world) {

    var mass_none = {
	density: 0.0,
	friction: 0.3
    }

    var mass_normal =  {
	density: 1.0,
	friction: 0.3
    }

    var collisions_none = {
	filterCategoryBits: 0x01,
	filterMaskBits: 0,
	filterGroupIndex: -1
    }

    var collisions_toplayer = {
	filterCategoryBits: 0x01,
	filterMaskBits: 0x01,
	filterGroupIndex: 1
    }

    var channel_pitch = 8.0;

    // Create the ground object, just in case we need it
    var ground = world.createBody();
    addFixture(ground, box(-5.0, 0, 1, 1), mass_none, collisions_none);

    // Create the hopper and injector
    // Injector consists of an active rectangle and an intangible rectangle
    var injector_levers = [];

    for(var i=0;i<8;i++) {
	let injector_lever = world.createBody({
	    type: "dynamic",
	    position: new Vec2(i*channel_pitch, 4.5)
	});

	var fix1 = box(-0.5, -0.5, 4.0, 1.0);
	var fix2 = box(-0.5, -3.5, 1.0, 4.0);
	addFixture(injector_lever, fix1, mass_none, collisions_none);
	addFixture(injector_lever, fix2, mass_normal, collisions_toplayer);

	//injector_lever.shapeOverride = union(fix1, fix2);

	var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	    lowerAngle: -0.25 * Math.PI,
	    upperAngle: 0.25 * Math.PI,
	    enableLimit: false,
	}, ground, injector_lever, Vec2(i*channel_pitch, 4.5)));
	injector_levers.push(injector_lever);

	// Add channel right side
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch+3.0,3.1)});
	addFixture(channel_side, box(0.0, -0.5, 1.0, 2.5), mass_none, collisions_toplayer);
	addFixture(channel_side, box(1.0, 1.0, 3.0, 1.0), mass_none, collisions_toplayer);

	// Add channel base
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch+2.0,-0.5)});
	addFixture(channel_side, box(-1, 0, 3.0, 1.0), mass_none, collisions_toplayer);

	// Add channel left side (backstop)
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch-1.25,0)});
	addFixture(channel_side, box(-0.5, 0, 1.0, 2.0), mass_none, collisions_toplayer);
    }

    // Add hopper
    var hopper_left = world.createBody({type: "static", position: new Vec2(-3.0,5.5)});
    addFixture(hopper_left, new Polygon([Vec2(0,0), Vec2(3,0), Vec2(-10,10), Vec2(-13,10)]), mass_none, collisions_toplayer);

    // Add hopper
    var hopper_right = world.createBody({type: "static", position: new Vec2(0.0+8*channel_pitch,5.5)});
    addFixture(hopper_right, new Polygon([Vec2(0,0), Vec2(3,0), Vec2(16,10), Vec2(13,10)]), mass_none, collisions_toplayer);

    for(var i=0;i<8;i++) {
	let ball1 = world.createBody({
	    type: "dynamic",
	    position: new Vec2(2.0, 8.0+2*i)
	});
	addFixture(ball1, new Circle(1.0), mass_normal, collisions_toplayer);
    }
}
