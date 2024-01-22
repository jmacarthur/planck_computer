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

    // Create a dynamic body with two fixtures as a composite
    let body = world.createBody({
	type: "dynamic",
	position: new Vec2(0.0, 4.0)
    });

    var fix1 = new Box(1.0, 1.0);
    var fix2 = new Polygon([Vec2(0,0), Vec2(2,0), Vec2(0,2)]);
    body.createFixture({
	shape: fix1,
	density: 1.0,
	friction: 0.3,
    });

    body.createFixture({
	shape: fix2,
	density: 1.0,
	friction: 0.3,
    });

    body.shapeOverride = union(fix1, fix2);

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
