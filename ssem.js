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

function translate_points(polygon, offsetx, offsety) {
    var newpoints = [];
    for(var i=0; i<polygon.length; i++) {
	var v = polygon[i];
	newpoints.push(new Vec2(v.x+offsetx, v.y+offsety));
    }
    return newpoints;
}

function create_crank(world, ground, x, y, initial_rotation) {
    // Rotation in radians. Zero rotation is an 'L' shape going up and left from the origin.
    var crank = world.createBody({type: "dynamic", position: new Vec2(x, y)});
    addFixture(crank, box(-0.5, -0.5, 1.0, 5.0), mass_normal, collisions_toplayer);
    addFixture(crank, box(-4.5, -0.5, 5.0, 1.0), mass_normal, collisions_toplayer);
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({}, ground, crank, Vec2(x,y)));
    crank.setAngle(initial_rotation);
    crank.attach1 = Vec2(x,y).add(Rot.mul(Rot(initial_rotation),Vec2(-4.5, 0)));
    crank.attach2 = Vec2(x,y).add(Rot.mul(Rot(initial_rotation),Vec2(0, 4.5)));
    return crank;
}

var channel_pitch = 8.0;
var row_separation = 4.0;
function create_injectors(world, ground, part_index) {
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

	var lever_shape = new Polygon();
	lever_shape.m_vertices = union(fix1, fix2);
	injector_lever.shapeOverride = [lever_shape];

	var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	    lowerAngle: -0.25 * Math.PI,
	    upperAngle: 0.25 * Math.PI,
	    enableLimit: false,
	}, ground, injector_lever, Vec2(i*channel_pitch, 4.5)));
	injector_levers.push(injector_lever);

	// Add channel right side
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch+3.0,3.1)});
	var side_poly = Polygon([Vec2(-0.5,-0.5), Vec2(0.8,-0.4), Vec2(0.8, 2.1), Vec2(-0.2, 2.1)]);
	addFixture(channel_side, side_poly, mass_none, collisions_toplayer);
	addFixture(channel_side, box(1.0, 1.0, 3.0, 1.0), mass_none, collisions_toplayer);

	// Add channel base
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch+2.0,-0.5)});
	var base_poly = Polygon([Vec2(-1,0), Vec2(2,0), Vec2(2,1.1), Vec2(-1,1)]);
	addFixture(channel_side, base_poly, mass_none, collisions_toplayer);

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
	    position: new Vec2(2.0+2*i, 8.0)
	});
	addFixture(ball1, new Circle(1.0), mass_normal, collisions_toplayer);
    }
    part_index['injector_levers'] = injector_levers;

    // Add injector controls and bar
    for(var i=0;i<8;i++) {
	let injector_control = world.createBody({type: "dynamic", position: new Vec2(i*channel_pitch+2.5, 20)});
	addFixture(injector_control, box(0,0,1,1), mass_normal, collisions_toplayer);
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : 2.0,
	    enableLimit : true
	}, ground, injector_control, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
	var distanceJoint = world.createJoint(pl.DistanceJoint({}, injector_levers[i], new Vec2(i*channel_pitch+3.0, 4.5), injector_control, new Vec2(i*channel_pitch+3.0,20.5)));
    }
    // Add all-inject bar
    let all_inject = world.createBody({type: "dynamic", position: new Vec2(0, 19)});
    addFixture(all_inject, box(0,0,8*channel_pitch,1), mass_normal, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : 2.0,
	enableLimit : true
    }, ground, all_inject, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
    all_inject.attach_point = Vec2(4*channel_pitch, 19.5);
    part_index['all_inject'] = all_inject;
}

function create_memory(world, ground, part_index) {
    var memory_lines = [];
    for(var row=0; row<8; row++) {
	var eject_line = world.createBody({type: "dynamic", position: new Vec2(-3.0, -30.0 + row_separation*row)});
	var block_line = world.createBody({type: "dynamic", position: new Vec2(-3.0, -30.0 + row_separation*row - 1.5)});
	var line_shapes = [];
	for(var col=0; col<8; col++) {
	    line_shapes.push(box(col*channel_pitch+2.0, 0, 5.0, 1.0));
	    addFixture(eject_line, box(col*channel_pitch+2.0, 0, 5.0, 1.0), mass_normal, collisions_toplayer);
	}

	line_shapes.push(new Polygon(translate_points([Vec2(0,0), Vec2(2,0), Vec2(1,2.5), Vec2(0,2.5)], col*7+7.0, 0)));
	for(var col=0;col<4;col++) {
	    line_shapes.push(box(8*channel_pitch+10+10*col+1.1, -0.1, 1.0, 1.0));
	}

	// Turn everything in 'line_shapes' into real fixtures and combine the
	// shapes into one polygon
	var compound_shape = new Polygon();
	var compound_shapes = [];
	for(var i=0;i<line_shapes.length;i++) {
	    addFixture(block_line, line_shapes[i], mass_normal, collisions_toplayer);
	    if(i==1) {
		compound_shape.m_vertices = union(line_shapes[0], line_shapes[1]);
		compound_shapes = multi_union([line_shapes[0]], [line_shapes[1]]);
	    } else if(i>1) {
		compound_shape.m_vertices = union(compound_shape, line_shapes[i]);
		compound_shapes = multi_union(compound_shapes, [line_shapes[i]]);
	    }
	}

	// Add another ghost fixture to hold the line together
	var joining_bar = box(0,0,8*channel_pitch+10+10*2+2, 1);
	addFixture(block_line, joining_bar, mass_none, collisions_none);
	joining_bar.colour = "#c0c0c0";
	block_line.shapeOverride = compound_shapes;
	block_line.shapeOverride.push(joining_bar);
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : -channel_pitch,
	    upperTranslation : 0.0,
	    enableLimit : true
	}, ground, eject_line, Vec2(0.0, 1.0), Vec2(1.0,0.0)));
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : -channel_pitch,
	    upperTranslation : 0.0,
	    enableLimit : true
	}, ground, block_line, Vec2(0.0, 1.0), Vec2(1.0,0.0)));
	memory_lines.push(eject_line);

	// Create the crank which biases the block line
	if(row<8) {
	    var crank_x = -10 - 5.0*row;
	    var crank_y = -35.5 + row_separation*row;
	    var bias_crank = create_crank(world, ground, crank_x, crank_y, 0);
	    var distanceJoint = world.createJoint(pl.DistanceJoint({}, bias_crank, new Vec2(crank_x, crank_y+4.5), block_line, new Vec2(-3.0,crank_y+4.5)));
	    console.log("Creating crank "+row+" and attaching it to things");
	}
    }
    // Memory line holdoff bar
    var memory_right_x = 8*channel_pitch+10*4;
    var memory_holdoff = world.createBody({type: "dynamic", position: new Vec2(memory_right_x-3.9, -32.0)});
    addFixture(memory_holdoff, box(0, 0, 2.0, 8*row_separation), mass_none, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : row_separation,
	enableLimit : false
    }, ground, memory_holdoff, Vec2(0.0, 0.0), Vec2(1.0,0)));

    // Memory line limiting block(s)
    var memory_limit = world.createBody({type: "static", position: new Vec2(memory_right_x-8, -32.0)});
    addFixture(memory_limit, box(0, 0, 1.0,1.0), mass_none, collisions_toplayer);
    // Memory holdoff crank
    var holdoff_crank = create_crank(world, ground, memory_right_x+10, -16, Math.PI);
    var distanceJoint = world.createJoint(pl.DistanceJoint({}, holdoff_crank, holdoff_crank.attach2, memory_holdoff, new Vec2(memory_right_x-3.5,-16.0)));
    part_index['memory_block_lines'] = memory_lines;
    part_index['memory_holdoff_crank'] = holdoff_crank;
}

function create_memory_decoder(world, ground, xoffset, yoffset, part_index) {
    /* This is the decoder pattern and holdoff bar */
    var decoder_lines = [];
    var sensor_drop = -100;
    var cols = 3;
    for(var col=0; col<cols; col++) {
	var decoder_line = world.createBody({type: "dynamic", position: new Vec2(-3.0+xoffset+col*10.0, yoffset)});
	// Add an intangible box to hold the columns together
	addFixture(decoder_line, box(0, sensor_drop, 1.0, row_separation*8+1-sensor_drop), mass_none, collisions_none);
	for(var row=0; row<8; row++) {
	    var offset = ((row>>(cols-1-col))%2==1)?0:1;
	    addFixture(decoder_line, box(0, row_separation*row-offset-1.0, 1.0, 1.0), mass_normal, collisions_toplayer);
	}

	// Add the decoder holdoff bar pin
	addFixture(decoder_line, box(0, row_separation*8,1.0,1.0), mass_normal, collisions_toplayer);
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : row_separation,
	    enableLimit : true
	}, ground, decoder_line, Vec2(0.0, 0.0), Vec2(0.0,1.0)));

	// Add the 'sensor'
	addFixture(decoder_line, box(0, sensor_drop, 1.0, 1.0), mass_normal, collisions_toplayer);

	decoder_lines.push(decoder_line);
    }

    // Add the holdoff bar
    var decoder_holdoff_bar = world.createBody({type: "dynamic", position: new Vec2(-3.0+xoffset, yoffset+row_separation*8-1)});
    addFixture(decoder_holdoff_bar, box(0,0,21,1), mass_normal, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : row_separation,
	enableLimit : true
    }, ground, decoder_holdoff_bar, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
    part_index['decoder_holdoff_bar'] = decoder_holdoff_bar;
}

function create_cam(world, ground, xoffset, yoffset) {
    var follower_height = 17;
    var follower_axis_x = -15+0.5;
    var base_radius = 15;
    var tab_height = 1;
    var lever_length = 25;
    var cam = world.createBody({type: "dynamic", position: new Vec2(xoffset, yoffset)});

    // Cam base circle
    var fake_circle_shape_points = [];
    var circle_interpolation = 32;
    for(var i=0;i<circle_interpolation; i++) {
	fake_circle_shape_points.push(Vec2(Math.cos(Math.PI*2*i/circle_interpolation)*base_radius,
					   Math.sin(Math.PI*2*i/circle_interpolation)*base_radius));
    }
    var fake_circle = [];
    fake_circle.m_vertices = fake_circle_shape_points; // If we make this a real Polygon, it'll restrict the number of vertices
    addFixture(cam, new Circle(base_radius), mass_normal, collisions_toplayer);

    // Cam profile
    var max_segments = 13;
    var profile_length = 1.3; // Radians!
    var start_angle = 0;
    var low_height = base_radius;
    var high_height = base_radius+tab_height;
    var rise_angle = 0.1;
    var fall_angle = 0;
    var point_array = [new Vec2(Math.cos(start_angle-fall_angle)*low_height, Math.sin(start_angle-fall_angle)*low_height)];
    for(var i=0;i<(max_segments-3);i++) {
	point_array.push(new Vec2(Math.cos(start_angle+i*profile_length/(max_segments-4)) * high_height,
				  Math.sin(start_angle+i*profile_length/(max_segments-4)) * high_height));
    }
    point_array.push(new Vec2(Math.cos(start_angle+profile_length+rise_angle)*low_height, Math.sin(start_angle+profile_length+rise_angle)*low_height));
    var profile_polygon = new Polygon(point_array);
    addFixture(cam, profile_polygon, mass_normal, collisions_toplayer);
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	maxMotorTorque: 10000000,
	motorSpeed: 0.1,
	enableMotor: true,
    }, ground, cam, Vec2(xoffset,yoffset)));

    var cam_shape = new Polygon();
    cam_shape.m_vertices = union(fake_circle, profile_polygon);
    cam.shapeOverride = [cam_shape];

    // Follower assembly
    var follower = world.createBody({type: "dynamic", position: new Vec2(xoffset+follower_axis_x-0.5, yoffset+follower_height)});
    var follower_arm = box(0,0,lever_length,1);
    var follower_point = new Polygon([Vec2(15-3,1), Vec2(15, -2), Vec2(15+3,1)]);
    addFixture(follower, follower_arm, mass_normal, collisions_toplayer);
    addFixture(follower, follower_point, mass_normal, collisions_toplayer);

    var follower_shape = new Polygon();
    follower_shape.m_vertices = union(follower_arm, follower_point);
    follower.shapeOverride = [follower_shape];

    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
    }, ground, follower, Vec2(xoffset+follower_axis_x,yoffset+follower_height+0.5)));
    follower.attach_point = Vec2(xoffset+follower_axis_x+lever_length-1, yoffset+follower_height+0.5);
    return follower;
}

function create_discarder(world, ground, origin_x, origin_y, part_index) {
    var block_width = channel_pitch - 2.2;
    for(var i=0;i<8;i++) {
	var discard_flap = world.createBody({type: "dynamic", position: new Vec2(origin_x+i*channel_pitch, origin_y+i*1+2)});
	addFixture(discard_flap, new Polygon([Vec2(0,0), Vec2(channel_pitch,0), Vec2(channel_pitch+1,1), Vec2(1,1)]), mass_normal, collisions_toplayer);
	var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	}, ground, discard_flap, Vec2(origin_x+i*channel_pitch+0.1, origin_y+i*1+2.1)));
	discard_flap.setAngle(0.3);
    }
    // One final rest
    var discarder_block = world.createBody({type: "static", position: new Vec2(origin_x+8*channel_pitch-1, origin_y+9.5)});
    addFixture(discarder_block, box(0,0,1,1), mass_none, collisions_toplayer);
}

function createWorld(world) {

    var part_index = [];
    // Create the ground object, just in case we need it
    var ground = world.createBody();
    addFixture(ground, box(-5.0, 0, 1, 1), mass_none, collisions_none);
    create_injectors(world, ground, part_index);
    create_memory(world, ground, part_index);
    create_memory_decoder(world, ground, channel_pitch*8+10, -29.5, part_index);
    create_discarder(world, ground, 0, -50, part_index);
    var decoder_holdoff_cam_follower = create_cam(world, ground, 80, 40);
    var memory_holdoff_cam_follower = create_cam(world, ground, 115, 40);
    var all_inject_cam_follower = create_cam(world, ground, 22, 40);
    var distanceJoint = world.createJoint(pl.DistanceJoint({
    }, decoder_holdoff_cam_follower, decoder_holdoff_cam_follower.attach_point, part_index['decoder_holdoff_bar'], Vec2(82.0,2.0)));
    var distanceJoint = world.createJoint(pl.DistanceJoint({
    }, decoder_holdoff_cam_follower, memory_holdoff_cam_follower.attach_point, part_index['memory_holdoff_crank'], part_index['memory_holdoff_crank'].attach1));
    var distanceJoint = world.createJoint(pl.DistanceJoint({
    }, all_inject_cam_follower, all_inject_cam_follower.attach_point, part_index['all_inject'], part_index['all_inject'].attach_point));
}
