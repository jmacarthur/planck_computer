'use strict';

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

    // Create the hopper and injector
    // Injector consists of an active rectangle and an intangible rectangle
    let body = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 4.0)
    });

    var fix1 = new Box(2.0, 0.5, new Vec2(1.5,0));
    var fix2 = new Box(0.5, 2.0, new Vec2(0,-1.5));
    body.createFixture({
	shape: fix1,
	density: 0.0,
	friction: 0.3,
	filterCategoryBits: 0x01,
	filterMaskBits: 0x0,
    });

    body.createFixture({
	shape: fix2,
	density: 1.0,
	friction: 0.3,
    });

    body.shapeOverride = union(fix1, fix2);

    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	lowerAngle: -0.25 * Math.PI,
	upperAngle: 0.25 * Math.PI,
	enableLimit: false,
    }, ground, body, Vec2(0.0, 4.0)));

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
