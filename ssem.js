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

    // Create the ground object
    var ground = world.createBody();
    ground.createFixture({
	shape: new pl.Edge(new Vec2(-50, 0), new Vec2(+50, 0)),
    });

    // Create the hopper and injector
    // Injector consists of an active rectangle and an intangible rectangle
    let injector_lever = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 4.0)
    });

    var fix1 = new Box(2.0, 0.5, new Vec2(1.5,0));
    var fix2 = new Box(0.5, 2.0, new Vec2(0,-1.5));
    addFixture(injector_lever, fix1, mass_none, collisions_none);
    addFixture(injector_lever, fix2, mass_normal, collisions_toplayer);

    //injector_lever.shapeOverride = union(fix1, fix2);

    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	lowerAngle: -0.25 * Math.PI,
	upperAngle: 0.25 * Math.PI,
	enableLimit: false,
    }, ground, injector_lever, Vec2(0.0, 4.0)));

    let ball1 = world.createBody({
	type: "dynamic",
	position: new Vec2(2.0, 8.0)
    });
    ball1.createFixture({
	shape: new Circle(1.0),
	density: 1.0,
	friction: 0.3,
    });
}
